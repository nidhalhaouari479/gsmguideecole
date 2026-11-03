import Hero from "@/components/home/Hero";
import Benefits from "@/components/home/Benefits";
import VideoReel from "@/components/home/VideoReel";
import UpcomingSessions from "@/components/home/UpcomingSessions";
import ContactSection from "@/components/home/ContactSection";
import StudentReels from "@/components/home/StudentReels";

const stats = [
  { value: "10+", label: "Années d'expérience" },
  { value: "3+", label: "Centres de réparation ouverts" },
  { value: "100 %", label: "Laboratoires pratiques" },
];

export default function Home() {
  return (
    <div className="flex w-full flex-col">
      <Hero />
      <UpcomingSessions />
      <Benefits />
      <VideoReel />

      {/* About Section */}
      <section id="about" className="site-section scroll-mt-24 bg-white">
        <div className="site-container">
          <div className="mx-auto max-w-3xl text-center">
            <p className="site-eyebrow mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green" aria-hidden="true" />
              À propos
            </p>
            <h2 className="site-title mb-5">
              Professionnalisme. Précision. <span className="text-brand-blue">Excellence.</span>
            </h2>
            <p className="site-lead">
              GSM Guide Academy est le premier centre de formation avancée en réparation de smartphones en Tunisie. Fondé par des vétérans de l&apos;industrie, nous comblons le fossé entre les réparations amateurs et l&apos;ingénierie professionnelle. Notre laboratoire est équipé des derniers outils de diagnostic et de micro-soudure.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3 md:mt-12 md:gap-5">
            {stats.map((stat, index) => (
              <div key={stat.label} className="site-card relative overflow-hidden p-6 text-center">
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-1 ${index === 0 ? 'bg-brand-green' : index === 1 ? 'bg-brand-blue' : 'bg-amber-500'}`}
                />
                <p className="mb-1.5 text-[40px] font-bold leading-none tracking-tight tabular-nums text-slate-900">{stat.value}</p>
                <p className="text-sm font-medium text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Témoignages (Reels) */}
          <div className="mt-16 md:mt-20">
            <StudentReels />
          </div>
        </div>
      </section>

      <ContactSection />
    </div>
  );
}
