'use client'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

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
                            <h1 className="text-balance text-4xl font-semibold md:text-5xl lg:text-6xl">
                                Verify anything with MisIntel
                            </h1>
                            <p className="text-muted-foreground mx-auto my-10 max-w-2xl text-xl">
                                Empower your decisions with AI-driven fact-checking and misinformation detection.
                            </p>

                            <Button
                            onClick={handleFactCheckingClick}
                                asChild
                                size="lg" className='cursor-pointer mb-4'>
                                    <span className="btn-label">Start Checking</span>
                            </Button>
                        </div>
                    </div>

                    <div className="mx-auto 2xl:max-w-7xl mb-12 md:mb-20">
                        <div className="perspective-distant pl-8 lg:pl-44">
                            <div className="lg:h-176 rotate-x-20 mask-b-from-55% mask-b-to-100% mask-r-from-75% skew-x-12 pl-6 pt-6">
                                <Image
                                    className="rounded-(--radius) border shadow-xl dark:hidden"
                                    src="/misintel-hero-bg.jpg"
                                    alt="MisIntel hero section"
                                    width={2880}
                                    height={2074}
                                />
                                <Image
                                    className="rounded-(--radius) hidden border shadow-xl dark:block"
                                    src="/misintel-hero-bg.jpg"
                                    alt="MisIntel hero section"
                                    width={2880}
                                    height={2074}
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}
