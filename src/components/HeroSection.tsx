'use client'
import { Button } from '@/components/ui/button'
import PixelTransition from '@/components/PixelTransition'

export default function HeroSection() {
    const handleFactCheckingClick = (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        const target = document.getElementById('fact-checker');
        if (target) {
            const navbarHeight = 80;
            const targetPosition = target.getBoundingClientRect().top + window.scrollY - navbarHeight;
            window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }
    };

    // Common class for the silver gradient text
    const silverGradientText = "bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent";

    return (
        <>
            <main>
                <div
                    aria-hidden
                    className="z-2 absolute inset-0 isolate hidden opacity-50 contain-strict lg:block">
                    <div className="w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
                    <div className="h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
                    <div className="h-320 -translate-y-87.5 absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
                </div>

                <section className="mt-12 md:mt-20 bg-muted/50 dark:bg-background overflow-hidden">
                    <div className="relative mx-auto max-w-5xl px-6 pt-28 lg:pt-24">
                        <div className="relative z-10 mx-auto text-center">
                            <h1 className="text-balance text-4xl font-semibold md:text-5xl lg:text-6xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
                                Verify anything with MisIntel
                            </h1>
                            <p className="text-neutral-400 mx-auto my-10 max-w-2xl text-xl">
                                Empower your decisions with AI-driven fact-checking and misinformation detection.
                            </p>

                            <Button
                                onClick={handleFactCheckingClick}
                                asChild
                                size="lg" 
                                className='cursor-pointer mb-16 bg-gradient-to-b from-neutral-50 to-neutral-400 text-black hover:from-neutral-100 hover:to-neutral-500'>
                                <span className="btn-label">Start Checking</span>
                            </Button>
                        </div>
                    </div>

                    <div className="mx-auto max-w-7xl mb-12 md:mb-20 flex justify-center px-6">
                        <PixelTransition
                            firstContent={
                                <img
                                    src="/trump-tweet.jpg"
                                    alt="Social media post example"
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                            }
                            secondContent={
                                <div
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: "black", /* CHANGED: Set to solid black */
                                        padding: "2rem"
                                    }}
                                >
                                    <div style={{ textAlign: "center", maxWidth: "90%" }}>
                                        <p className={silverGradientText} style={{ 
                                            fontWeight: 900, 
                                            fontSize: "2rem", 
                                            marginBottom: "1rem",
                                            lineHeight: "1.2"
                                        }}>
                                            SIKE! This was Fake
                                        </p>
                                        <p className={silverGradientText} style={{ 
                                            fontWeight: 600, 
                                            fontSize: "1.1rem", 
                                            marginBottom: "0.75rem",
                                            lineHeight: "1.4"
                                        }}>
                                            Fake headline sends Wall Street into US$2.4 trillion whiplash
                                        </p>
                                        <p className={silverGradientText} style={{ 
                                            fontWeight: 400, 
                                            fontSize: "0.95rem", 
                                            lineHeight: "1.5"
                                        }}>
                                            Don't believe everything you see online. Always verify first.
                                        </p>
                                    </div>
                                </div>
                            }
                            gridSize={14}
                            pixelColor='#e5e5e5'
                            once={false}
                            animationStepDuration={0.5}
                            className="w-full max-w-lg"
                            style={{ 
                                width: '100%', 
                                maxWidth: '600px',
                                backgroundColor: 'transparent',
                                border: '2px solid rgba(229, 229, 229, 0.2)',
                                borderRadius: '20px'
                            }}
                            aspectRatio="65%"
                        />
                    </div>
                </section>
            </main>
        </>
    )
}