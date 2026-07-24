import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { trackPageview } from "@/lib/track";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SarlaYash Blessings — Internship Platform" },
      {
        name: "description",
        content:
          "Apply to the SarlaYash Blessings internship — hands-on projects, mentorship, and placement readiness from SarlaYash Learning Solutions LLP.",
      },
      { property: "og:title", content: "SarlaYash Blessings — Internship Platform" },
      {
        property: "og:description",
        content:
          "Legacy of Values. Future of Learning. Apply, learn, build, and earn a verifiable certificate.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  useEffect(() => {
    void trackPageview("/");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            <span className="font-serif text-lg font-semibold tracking-tight">
              SarlaYash Blessings
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#program" className="hover:text-foreground">Program</a>
            <a href="#tracks" className="hover:text-foreground">Tracks</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#verify" className="hover:text-foreground">Verify certificate</a>
          </nav>
          <Link to="/auth">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Sign in
            </Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-32">
          <p className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-px w-8 bg-accent" />
            SarlaYash Learning Solutions LLP
          </p>
          <h1 className="max-w-4xl font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl">
            Legacy of Values.
            <br />
            <span className="text-accent">Future of Learning.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-muted-foreground">
            A structured internship program built around hands-on projects, mentorship,
            AI-assisted learning, and real placement readiness. Apply once, learn deeply,
            ship your portfolio, and graduate with a verifiable certificate.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Start your application
              </Button>
            </Link>
            <a href="#program" className="text-sm font-medium underline-offset-4 hover:underline">
              Learn about the program →
            </a>
          </div>
        </section>

        <div className="gold-underline mx-auto max-w-6xl" />

        <section id="program" className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-16 md:grid-cols-3">
            {[
              {
                k: "01",
                t: "Apply & assess",
                d: "Submit your application, complete a track-specific assessment, and receive a formal offer letter on acceptance.",
              },
              {
                k: "02",
                t: "Learn & build",
                d: "Guided projects with structured milestones, mentor reviews, and AI-assisted learning support throughout.",
              },
              {
                k: "03",
                t: "Ship & certify",
                d: "Submit your final project, earn a unique verifiable certificate, and unlock placement readiness resources.",
              },
            ].map((s) => (
              <div key={s.k}>
                <div className="mb-4 font-serif text-sm text-accent">{s.k}</div>
                <h3 className="font-serif text-2xl">{s.t}</h3>
                <p className="mt-3 text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="tracks" className="border-t border-border/60 bg-secondary/40">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className="font-serif text-4xl">Mission</h2>
            <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
              Empowering learners through hands-on projects, mentorship, AI-assisted
              learning and placement readiness — one cohort at a time.
            </p>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid items-start gap-12 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-4xl">Ready when you are.</h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Sign in with Google to create your applicant profile. Your progress,
                assessments, projects, and certificates all live in one place.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-8">
              <div className="text-sm uppercase tracking-widest text-accent">Next cohort</div>
              <div className="mt-3 font-serif text-3xl">Applications open</div>
              <p className="mt-3 text-muted-foreground">
                One account. Google sign-in only. No spam, no reselling of data.
              </p>
              <Link to="/auth" className="mt-6 inline-block">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Continue with Google
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="verify" className="border-t border-border/60">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h2 className="font-serif text-2xl">Verify a certificate</h2>
                <p className="mt-2 text-muted-foreground">
                  Every SarlaYash Blessings certificate carries a unique verification code.
                </p>
              </div>
              <Link to="/verify">
                <Button variant="outline">Open verifier</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center">
          <div>
            © {new Date().getFullYear()} SarlaYash Learning Solutions LLP
          </div>
          <div className="flex gap-6">
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <Link to="/verify" className="hover:text-foreground">Verify certificate</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
