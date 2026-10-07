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
      <section id="about" className="scroll-mt-24 bg-white py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-blue">À propos</p>
            <h2 className="mb-5 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              Professionnalisme. Précision. Excellence.
            </h2>
            <p className="text-base leading-relaxed text-slate-600 md:text-lg">
              GSM Guide Academy est le premier centre de formation avancée en réparation de smartphones en Tunisie. Fondé par des vétérans de l&apos;industrie, nous comblons le fossé entre les réparations amateurs et l&apos;ingénierie professionnelle. Notre laboratoire est équipé des derniers outils de diagnostic et de micro-soudure.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3 md:mt-12">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                <p className="mb-1 text-4xl font-black tabular-nums text-brand-blue">{stat.value}</p>
                <p className="text-sm font-semibold text-slate-700">{stat.label}</p>
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
