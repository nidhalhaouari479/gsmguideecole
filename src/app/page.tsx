import Hero from "@/components/home/Hero";
import Benefits from "@/components/home/Benefits";
import VideoReel from "@/components/home/VideoReel";
import UpcomingSessions from "@/components/home/UpcomingSessions";
import ContactSection from "@/components/home/ContactSection";
import StudentReels from "@/components/home/StudentReels";export default function Home() {
  return (
    <div className="flex flex-col w-full">
      <Hero />
      <Benefits />
      <VideoReel />
      <UpcomingSessions />

      {/* About Section */}
      <section id="about" className="py-24 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-center italic">Professionnalisme. Précision. Excellence.</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 text-center leading-relaxed mb-12">
              GSM Guide Academy est le premier centre de formation avancée en réparation de smartphones en Tunisie. Fondé par des vétérans de l'industrie, nous comblons le fossé entre les réparations amateurs et l'ingénierie professionnelle. Notre laboratoire est équipé des derniers outils de diagnostic et de micro-soudure.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center mb-24">
              <div>
                <div className="text-4xl font-black text-brand-blue mb-2">10+</div>
                <div className="font-bold text-slate-700">Années d'Expérience</div>
              </div>
              <div>
                <div className="text-4xl font-black text-brand-blue mb-2">3+</div>
                <div className="font-bold text-slate-700">Centres de Réparation Ouverts</div>
              </div>
              <div>
                <div className="text-4xl font-black text-brand-blue mb-2">100%</div>
                <div className="font-bold text-slate-700">Laboratoires Pratiques</div>
              </div>
            </div>

            {/* Témoignages (Reels) */}
            <StudentReels />
          </div>
        </div>
      </section>

      <ContactSection />
    </div>
  );
}
