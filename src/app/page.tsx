import Hero from "@/components/home/Hero";
import Benefits from "@/components/home/Benefits";
import VideoReel from "@/components/home/VideoReel";
import UpcomingSessions from "@/components/home/UpcomingSessions";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      <Hero />
      <Benefits />
      <VideoReel />
      <UpcomingSessions />

      {/* About/Contact placeholder sections */}
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

      <section id="contact" className="py-24 bg-slate-50 dark:bg-slate-950">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Contactez-nous</h2>
            <p className="text-slate-600 dark:text-slate-400">Des questions ? Nous sommes là pour vous aider à lancer votre carrière.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="premium-card p-10 bg-white">
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold mb-2">Nom Complet</label>
                    <input type="text" className="w-full p-3 rounded-lg border border-border focus:ring-2 focus:ring-brand-blue outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">E-mail</label>
                    <input type="email" className="w-full p-3 rounded-lg border border-border focus:ring-2 focus:ring-brand-blue outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Sujet</label>
                  <input type="text" className="w-full p-3 rounded-lg border border-border focus:ring-2 focus:ring-brand-blue outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Message</label>
                  <textarea rows={4} className="w-full p-3 rounded-lg border border-border focus:ring-2 focus:ring-brand-blue outline-none"></textarea>
                </div>
                <button type="submit" className="btn-primary w-full">Envoyer le message</button>
              </form>
            </div>
            <div className="flex flex-col justify-between h-full">
              <div className="space-y-8 mb-12">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-brand-blue/10 rounded-xl text-brand-blue"><Phone /></div>
                  <div>
                    <div className="font-bold text-xl">Téléphone</div>
                    <div className="text-slate-600">+216 54 15 15 15</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-brand-blue/10 rounded-xl text-brand-blue"><Mail /></div>
                  <div>
                    <div className="font-bold text-xl">E-mail</div>
                    <div className="text-slate-600">Gsmguideacademy@gmail.com</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-brand-blue/10 rounded-xl text-brand-blue"><MapPin size={24} className="shrink-0" /></div>
                  <div>
                    <div className="font-bold text-xl">Adresse</div>
                    <div className="text-slate-600">Centre Makni, Menzah 9, Tunis, Tunisie</div>
                  </div>
                </div>
              </div>

              {/* Google Maps Integration */}
              <div className="w-full h-64 rounded-3xl overflow-hidden shadow-2xl border border-border">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3192.837574959774!2d10.1512780753052!3d36.84636586509678!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12fd33bd1e95da93%3A0x4bf9be9ecc20cedd!2sGsm%20Guide%20Academy!5e0!3m2!1sfr!2stn!4v1772617470401!5m2!1sfr!2stn"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MapPin({ size = 24, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function Phone({ size = 24, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function Mail({ size = 24, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
