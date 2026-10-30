import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Loading() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="site-container pt-5 lg:pt-7 pb-12">
          {/* Hero skeleton：Banner + 主编精选 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-10 lg:mb-14">
            <div className="lg:col-span-8">
              <div className="aspect-[16/9] animate-pulse" style={{ backgroundColor: 'var(--c-surface)' }} />
            </div>
            <div className="hidden lg:flex lg:col-span-4 flex-col gap-3">
              <div className="h-5 w-32 animate-pulse" style={{ backgroundColor: 'var(--c-surface)' }} />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4 py-4 border-b animate-pulse" style={{ borderColor: 'var(--c-border)' }}>
                  <div className="w-7 h-7" style={{ backgroundColor: 'var(--c-surface)' }} />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 w-11/12" style={{ backgroundColor: 'var(--c-surface)' }} />
                    <div className="h-3 w-1/3" style={{ backgroundColor: 'var(--c-surface)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            <div className="lg:col-span-8">
              <div className="h-6 w-40 mb-5 animate-pulse" style={{ backgroundColor: 'var(--c-surface)' }} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-9">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[16/10]" style={{ backgroundColor: 'var(--c-surface)' }} />
                    <div className="pt-4 space-y-2">
                      <div className="h-5 w-full" style={{ backgroundColor: 'var(--c-surface)' }} />
                      <div className="h-5 w-3/4" style={{ backgroundColor: 'var(--c-surface)' }} />
                      <div className="h-3 w-1/3" style={{ backgroundColor: 'var(--c-surface)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="h-[420px] animate-pulse" style={{ backgroundColor: 'var(--c-surface)' }} />
              <div className="h-64 animate-pulse" style={{ backgroundColor: 'var(--c-surface)' }} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
