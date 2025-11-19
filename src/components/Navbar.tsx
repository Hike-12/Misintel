"use client";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
	{
		name: "News",
		link: "#trending-news",
	},
	{
		name: "Why MisIntel?",
		link: "#why-misintel",
	},
	{
		name: "More",
		link: "#features",
	},
];

export function NavbarDemo() {
	const [menuState, setMenuState] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const [isResizing, setIsResizing] = useState(false);

	useEffect(() => {
		const onScroll = () => setIsScrolled(window.scrollY > 50);
		window.addEventListener("scroll", onScroll);

		let resizeTimer: number | undefined;
		const onResize = () => {
			setIsResizing(true);
			if (resizeTimer) window.clearTimeout(resizeTimer);
			resizeTimer = window.setTimeout(() => setIsResizing(false), 200);
		};
		window.addEventListener("resize", onResize);

		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onResize);
			if (resizeTimer) window.clearTimeout(resizeTimer);
		};
	}, []);

	const scrollToId = (id: string) => {
		const target = document.getElementById(id);
		if (!target) return;
		const navbarHeight = 96; // px
		const targetPosition =
			target.getBoundingClientRect().top + window.scrollY - navbarHeight;
		window.scrollTo({ top: targetPosition, behavior: "smooth" });
	};

	const handleNavClick = (e: React.MouseEvent, href: string) => {
		e.preventDefault();
		const id = href.replace("#", "");
		scrollToId(id);
		setMenuState(false);
	};

	const handleGetStartedClick = (e?: React.MouseEvent) => {
		if (e) e.preventDefault();
		scrollToId("fact-checker");
		setMenuState(false);
	};

	return (
		<header>
			<nav
				data-state={menuState && "active"}
				className={cn(
					"fixed z-20 w-full px-2 transition-all duration-200",
					isScrolled ? "top-4" : "top-1"
				)}
			>
				<div
					className={cn(
						"mx-auto max-w-6xl px-6 transition-all duration-300 lg:px-12",
						// show rounded bg when scrolled or mobile menu open, but remove heavy bg while resizing
						(isScrolled || menuState) && !isResizing
							? "bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5"
							: ""
					)}
				>
					<div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
						<div className="flex w-full justify-between lg:w-auto">
							<Link
								href="/"
								aria-label="home"
								className="flex items-center space-x-2"
							>
								<h2 className="font-bold text-lg">MisIntel</h2>
							</Link>

							<button
								onClick={() => setMenuState(!menuState)}
								aria-label={menuState ? "Close Menu" : "Open Menu"}
								className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
							>
								{menuState ? (
									<X className="m-auto size-6 duration-200" />
								) : (
									<Menu className="m-auto size-6 duration-200" />
								)}
							</button>
						</div>

						{/* Desktop center nav */}
						<div className="absolute inset-0 m-auto hidden size-fit lg:block">
							<ul className="flex gap-8 text-sm">
								{navItems.map((item, idx) => (
									<li key={idx}>
										<a
											href={item.link}
											onClick={(e) => handleNavClick(e, item.link)}
											className="text-muted-foreground hover:text-accent-foreground block duration-150"
										>
											{item.name}
										</a>
									</li>
								))}
							</ul>
						</div>

						{/* Right side: Get Started button (desktop) */}
						<div className="hidden lg:flex items-center gap-4">
							<Button
								onClick={handleGetStartedClick}
								className="bg-gradient-to-b from-neutral-50 to-neutral-400 text-black font-semibold rounded-lg"
							>
								Get Started
							</Button>
						</div>

						{/* Mobile menu panel */}
						<div
							className={cn(
								"bg-background lg:in-data-[state=active]:flex mb-6 w-full flex-wrap items-center justify-end space-y-8 border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent",
								// show/hide & styling when menuState is active; remove background when resizing
								menuState
									? cn(
											"block rounded-lg",
											isResizing
												? "bg-transparent border-transparent shadow-none"
												: "bg-background/95 border rounded-lg"
									  )
									: "hidden"
							)}
						>
							{/* Mobile links */}
							<div className="lg:hidden w-full">
								<ul className="space-y-6 text-base">
									{navItems.map((item, idx) => (
										<li key={idx}>
											<a
												href={item.link}
												onClick={(e) => handleNavClick(e, item.link)}
												className="text-muted-foreground hover:text-accent-foreground block duration-150"
											>
												{item.name}
											</a>
										</li>
									))}
								</ul>

								<div className="mt-6 flex w-full flex-col gap-3">
									<Button
										onClick={handleGetStartedClick}
										className="w-full bg-gradient-to-b from-neutral-50 to-neutral-400 text-black rounded-lg"
									>
										Get Started
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</nav>
		</header>
	);
}

export default NavbarDemo;