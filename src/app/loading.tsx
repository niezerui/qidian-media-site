import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Loading() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="site-container py-6">
          {/* Banner skeleton */}
          <div className="mb-6 aspect-[21/9] rounded-xl animate-pulse" style={{ backgroundColor: 'var(--c-surface)' }} />
          {/* List skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            <div className="lg:col-span-3 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 py-4 border-b animate-pulse" style={{ borderColor: 'var(--c-border)' }}>
                  <div className="w-40 h-24 rounded-lg flex-shrink-0" style={{ backgroundColor: 'var(--c-surface)' }} />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 w-24 rounded" style={{ backgroundColor: 'var(--c-surface)' }} />
                    <div className="h-5 w-3/4 rounded" style={{ backgroundColor: 'var(--c-surface)' }} />
                    <div className="h-3 w-1/3 rounded" style={{ backgroundColor: 'var(--c-surface)' }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-1">
              <div className="h-64 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--c-surface)' }} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
