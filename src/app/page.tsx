import Hero from "@/components/home/Hero";
import Benefits from "@/components/home/Benefits";
import VideoReel from "@/components/home/VideoReel";
import UpcomingSessions from "@/components/home/UpcomingSessions";
import ContactSection from "@/components/home/ContactSection";

export default function Home() {
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

            {/* Témoignages */}
            <div>
              <h3 className="text-3xl font-bold mb-10 text-center">Ce que disent nos étudiants</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                {/* Testimonial 1 */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-border relative shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-brand-green mb-4 text-xl">
                    ★★★★★
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 italic mb-6">"Une formation exceptionnelle ! J'ai appris la micro-soudure de A à Z et j'ai pu ouvrir mon propre centre de réparation directement après. Merci à toute l'équipe de GSM Guide Academy."</p>
                  <div className="flex items-center gap-4">
                    <img src="https://i.pravatar.cc/150?img=11" alt="Student" className="w-12 h-12 rounded-full border-2 border-brand-green/30" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Ahmed B.</div>
                      <div className="text-xs text-brand-blue font-bold">Technicien Certifié</div>
                    </div>
                  </div>
                </div>
                {/* Testimonial 2 */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-border relative shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-brand-green mb-4 text-xl">
                    ★★★★★
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 italic mb-6">"Les formateurs sont des experts passionnés. Les équipements du laboratoire sont à la pointe de la technologie. C'est le meilleur investissement pour ma carrière professionnelle."</p>
                  <div className="flex items-center gap-4">
                    <img src="https://i.pravatar.cc/150?img=32" alt="Student" className="w-12 h-12 rounded-full border-2 border-brand-green/30" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Sarah T.</div>
                      <div className="text-xs text-brand-blue font-bold">Experte Smartphone</div>
                    </div>
                  </div>
                </div>
                {/* Testimonial 3 */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-border relative shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-brand-green mb-4 text-xl">
                    ★★★★★
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 italic mb-6">"Je pensais avoir besoin d'années pour maîtriser la réparation logicielle, mais grâce aux méthodes pédagogiques de l'académie, j'ai tout compris rapidement."</p>
                  <div className="flex items-center gap-4">
                    <img src="https://i.pravatar.cc/150?img=53" alt="Student" className="w-12 h-12 rounded-full border-2 border-brand-green/30" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Karim R.</div>
                      <div className="text-xs text-brand-blue font-bold">Spécialiste Logiciel</div>
                    </div>
                  </div>
                </div>
                {/* Testimonial 4 */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-border relative shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-brand-green mb-4 text-xl">
                    ★★★★★
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 italic mb-6">"Le suivi après la formation est incroyable. L'équipe continue de m'aider avec des pannes complexes même des mois après ma certification."</p>
                  <div className="flex items-center gap-4">
                    <img src="https://i.pravatar.cc/150?img=47" alt="Student" className="w-12 h-12 rounded-full border-2 border-brand-green/30" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Imen F.</div>
                      <div className="text-xs text-brand-blue font-bold">Technicienne Indépendante</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ContactSection />
    </div>
  );
}
