import Link from "next/link";
import Image from "next/image";
import { PanelsTopLeft } from "lucide-react";
import { ArrowRightIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import ChatBot from '@/components/chat-bot/chatbot'
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import ShowPage from "@/components/data-table/showPage";
import LogoQF from '@/components/admin-panel/logoQF.png'
export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="z-[50] sticky top-0 w-full bg-background/95 border-b backdrop-blur-sm dark:bg-black/[0.6] border-border/40">
        <div className="container h-14 flex items-center justify-between">
          {/* Logo and Brand Name */}
          <Link href="/" className="flex items-center gap-2">
            <Image src={LogoQF.src}  width={50} height={50} alt="quickform"/>
            <span className="font-bold text-lg tracking-tight hidden sm:inline-block">
              <span style={{color:'#37B9FD'}}>QUICK </span><span style={{}}>FORM</span>
            </span>
            <span className="font-bold text-base tracking-tight sm:hidden">QF</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <ModeToggle />
          </nav>
        </div>
      </header>
      <main className="min-h-[calc(100vh-57px-97px)] flex-1">
        <ShowPage />
        <ChatBot/>
      </main>
      <footer className="py-6 md:py-0 border-t border-border/40">
        <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground">
            Create Forms in seconds with{" "}
            <Link
              href="https://github.com/quickform"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4"
            >
              QuickForm
            </Link>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
