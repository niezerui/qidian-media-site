import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/admin/import-file
 * 接受上传的文件（.docx, .doc, .md, .txt, .html），解析为 HTML 正文
 * 返回 { success, title, content, images } 供前端填入编辑器
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: '没有上传文件' }, { status: 400 });
    }

    const fileName = file.name || '';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const allowedExts = ['docx', 'doc', 'md', 'txt', 'html', 'htm'];
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({
        success: false,
        error: `不支持的文件格式 .${ext}，支持：${allowedExts.join(', ')}`,
      }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: '文件不能超过 20MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let title = fileName.replace(/\.[^.]+$/, ''); // 默认用文件名作标题
    let html = '';
    // 图片列表（base64 data URI，可在正文中内嵌显示）
    const images: { name: string; dataUri: string }[] = [];

    if (ext === 'docx' || ext === 'doc') {
      // 使用 mammoth 解析 Word 文档
      const mammoth = require('mammoth');

      // 自定义图片处理：将 Word 内嵌图片转为 base64
      const result = await mammoth.convertToHtml({ buffer }, {
        convertImage: mammoth.images.imgElement((img: any) => {
          return img.read('base64').then((imageData: string) => {
            const dataUri = `data:${img.contentType};base64,${imageData}`;
            images.push({ name: `image_${images.length + 1}`, dataUri });
            return { src: dataUri };
          });
        }),
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='标题 1'] => h1:fresh",
          "p[style-name='标题 2'] => h2:fresh",
          "p[style-name='标题 3'] => h3:fresh",
        ],
      });
      html = result.value;

      // 尝试从 H1 提取标题
      const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
      if (h1Match) {
        title = h1Match[1].replace(/<[^>]+>/g, '').trim() || title;
        // 如果 H1 就是标题，从正文中删除
        if (title) html = html.replace(h1Match[0], '');
      }

    } else if (ext === 'md') {
      // Markdown → HTML
      const { marked } = require('marked');
      marked.setOptions({ breaks: true, gfm: true });
      html = await marked(buffer.toString('utf-8'));

      // 尝试从 # 标题提取
      const lines = buffer.toString('utf-8').split('\n');
      const h1Line = lines.find(l => l.startsWith('# '));
      if (h1Line) {
        title = h1Line.replace(/^#+\s*/, '').trim() || title;
      }

    } else if (ext === 'txt') {
      // 纯文本：每行转为 <p>，空行转为段落分隔
      const text = buffer.toString('utf-8');
      const lines = text.split('\n');
      const paragraphs: string[] = [];
      let current: string[] = [];

      for (const line of lines) {
        if (line.trim() === '') {
          if (current.length > 0) {
            paragraphs.push(`<p>${current.join('<br/>')}</p>`);
            current = [];
          }
        } else {
          current.push(line.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        }
      }
      if (current.length > 0) paragraphs.push(`<p>${current.join('<br/>')}</p>`);
      html = paragraphs.join('\n');

      // 第一行作为标题
      const firstLine = lines.find(l => l.trim());
      if (firstLine) title = firstLine.trim().slice(0, 100) || title;

    } else if (ext === 'html' || ext === 'htm') {
      // HTML 文件：提取 body 内容
      const rawHtml = buffer.toString('utf-8');
      // 尝试提取 <title>
      const titleMatch = rawHtml.match(/<title[^>]*>(.*?)<\/title>/i);
      if (titleMatch) title = titleMatch[1].trim() || title;
      // 提取 <body> 内容
      const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      html = bodyMatch ? bodyMatch[1] : rawHtml;
    }

    // 清理生成的 HTML（去除空段落、冗余标签）
    html = html
      .replace(/<p>\s*<\/p>/g, '')  // 去除空 p
      .replace(/<p><br\s*\/?>\s*<\/p>/g, '')  // 去除只含 br 的 p
      .trim();

    if (!html) {
      return NextResponse.json({ success: false, error: '文件内容为空或无法解析' }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      data: {
        title,
        content: html,
        imageCount: images.length,
        warnings: [],
      },
    });

  } catch (error: any) {
    console.error('[import-file] error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: `解析失败：${error.message}` }, { status: 500 });
  }
}
