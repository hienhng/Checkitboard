import { useState } from "react";
import { AnimatePresence, motion, MotionConfig, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Link, Redirect } from "wouter";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, GraduationCap, Layers, RotateCcw, Sparkles, TrendingUp, Users, PenLine, Plus, MoveUpRight, Pause, Play } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import "./hero-page.css";

const words = [
  { word: "serendipity", pronunciation: "/ˌser.ənˈdɪp.ə.ti/", type: "noun", definition: "The chance discovery of something wonderful when you weren’t looking for it.", example: "Finding her favorite book in the little café was pure serendipity.", options: ["A carefully planned event", "An unexpected, happy discovery", "A familiar daily routine"], answer: 1 },
  { word: "resilient", pronunciation: "/rɪˈzɪl.i.ənt/", type: "adjective", definition: "Able to recover and keep going after something difficult.", example: "Like a tree after a storm, she stayed resilient and began again.", options: ["Able to recover from difficulty", "Unwilling to try new things", "Easily distracted"], answer: 0 },
  { word: "curiosity", pronunciation: "/ˌkjʊr.iˈɑː.sə.ti/", type: "noun", definition: "A strong desire to learn, explore, or understand something new.", example: "His curiosity turned a simple question into a whole afternoon of discovery.", options: ["A feeling of certainty", "A wish to be alone", "A desire to learn and discover"], answer: 2 },
];

const features = [
  { icon: BookOpen, title: "Find meaning in context", description: "Turn reading passages into words worth remembering." },
  { icon: Layers, title: "Make practice personal", description: "Build confidence with flashcards and vocabulary check-ups." },
  { icon: TrendingUp, title: "See learning take shape", description: "Follow progress and discover what needs a little more practice." },
];

const steps = [
  { icon: BookOpen, title: "Start with a little reading.", description: "Bring a passage you love, a classroom text, or something that sparks curiosity. Educators can turn it into a vocabulary assignment.", detail: "A story. An article. A new perspective." },
  { icon: Layers, title: "Give new words a home.", description: "Explore meanings in context, revisit them with flashcards, and put your understanding into practice with vocabulary check-ups.", detail: "Read it. Recall it. Make it yours." },
  { icon: TrendingUp, title: "Watch understanding grow.", description: "Review results, find the words that need another look, and return to practice with a clearer idea of what comes next.", detail: "Small discoveries add up." },
];

const questions = [
  { question: "Who is Checkit for?", answer: "Checkit brings educators and learners together. Educators organize classes and vocabulary assignments, while learners practice words, complete check-ups, and follow their progress." },
  { question: "Can I use my own reading passages?", answer: "Yes. Educators can write or paste a reading passage, select vocabulary, and build an assignment around the material their class is already exploring." },
  { question: "How can learners practice?", answer: "Learners can revisit their vocabulary with flashcards and practice modes, then complete assigned check-ups to see how well they understand the words." },
  { question: "How do I get started?", answer: "Create an account, choose your educator or learner role, and verify your email. Educators can then set up a class and create assignments; learners can join their class with a class code." },
];

function VocabularyPreview() {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState("flashcards");
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [discovered, setDiscovered] = useState<number[]>([]);
  const [direction, setDirection] = useState(1);
  const [motionPaused, setMotionPaused] = useState(false);
  const [celebration, setCelebration] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = prefersReducedMotion || motionPaused;
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [3, -3]), { stiffness: 180, damping: 24 });
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-4, 4]), { stiffness: 180, damping: 24 });
  const word = words[index];
  const selected = answers[index] ?? null;
  const complete = discovered.length === words.length;
  const transition = { duration: reduceMotion ? 0 : 0.22 };

  function discoverWord() {
    setDiscovered((current) => current.includes(index) ? current : [...current, index]);
  }

  function goToWord(next: number, nextDirection: number) {
    setDirection(nextDirection);
    setIndex(next);
    setRevealed(false);
  }

  function changeWord(direction: number) {
    goToWord((index + direction + words.length) % words.length, direction);
  }

  function restart() {
    setIndex(0);
    setRevealed(false);
    setAnswers({});
    setDiscovered([]);
    setCelebration(0);
  }

  return <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
    <div className="hero-preview-scene" data-motion={reduceMotion ? "off" : "on"}>
    <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
    <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
    <div className="hero-spark hero-spark-one" aria-hidden="true">✳</div>
    <div className="hero-spark hero-spark-two" aria-hidden="true">✧</div>
    <div className="hero-preview-note"><span className="hero-note-icon"><Sparkles size={15} /></span>A little practice. A lasting connection.</div>
    <div className="hero-demo-perspective" onPointerMove={(event) => {
      if (reduceMotion || event.pointerType !== "mouse") return;
      const bounds = event.currentTarget.getBoundingClientRect();
      pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
      pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
    }} onPointerLeave={() => { pointerX.set(0); pointerY.set(0); }}>
    <div className="hero-card-back" aria-hidden="true" />
    <motion.section className="hero-demo" aria-label="Interactive vocabulary demo" style={reduceMotion ? { rotateX: 0, rotateY: 0 } : { rotateX, rotateY }}>
      <div className="hero-demo-header"><span className="flex items-center gap-2 text-xs font-semibold"><span className="hero-live-dot" />Your daily discovery</span><button type="button" className="hero-motion-toggle" aria-label={motionPaused ? "Resume preview animations" : "Pause preview animations"} aria-pressed={motionPaused} onClick={() => setMotionPaused((current) => !current)}>{motionPaused ? <Play size={12} /> : <Pause size={12} />}<span>LIVE PREVIEW</span></button></div>
      <div className="hero-demo-tabs" role="tablist" aria-label="Preview study mode">
        {[{ value: "flashcards", label: "Flashcards", icon: Layers }, { value: "checkup", label: "Quick check", icon: Check }].map(({ value, label, icon: Icon }) => <button key={value} type="button" id={`preview-tab-${value}`} role="tab" aria-selected={mode === value} aria-controls="preview-panel" tabIndex={mode === value ? 0 : -1} onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const next = event.key === "Home" ? "flashcards" : event.key === "End" ? "checkup" : mode === "flashcards" ? "checkup" : "flashcards";
            setMode(next);
            document.getElementById(`preview-tab-${next}`)?.focus();
          }
        }} onClick={() => setMode(value)}>{mode === value && <motion.span className="hero-tab-indicator" layoutId="hero-study-tab" transition={transition} />}<Icon size={14} /><span>{label}</span></button>)}
      </div>
      <div id="preview-panel" role="tabpanel" aria-labelledby={`preview-tab-${mode}`} className="hero-preview-panel" tabIndex={0} onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          changeWord(event.key === "ArrowRight" ? 1 : -1);
        }
      }}>
      <AnimatePresence initial={false} mode="wait" custom={direction}>
      <motion.div key={index} className="hero-word-content" custom={direction} variants={{ enter: (travel: number) => ({ opacity: 0, x: reduceMotion ? 0 : travel * 25 }), center: { opacity: 1, x: 0 }, exit: (travel: number) => ({ opacity: 0, x: reduceMotion ? 0 : travel * -20 }) }} initial="enter" animate="center" exit="exit" transition={transition}>
        <div className="flex items-center justify-between"><span className="hero-word-label">A WORD TO REMEMBER</span><BookOpen className="h-5 w-5 text-primary/60" /></div>
        <h2 className="hero-word">{word.word}</h2>
        <p className="mt-2 text-xs text-muted-foreground">{word.pronunciation}<span className="ml-3 font-serif italic">{word.type}</span></p>
        <div className="hero-definition-space"><AnimatePresence initial={false} mode="wait">
          <motion.div key={`${mode}-${revealed}`} initial={{ opacity: 0, y: reduceMotion ? 0 : 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }} transition={transition}>
          {mode === "flashcards" ? revealed ? <div aria-live="polite"><p className="text-sm leading-7">{word.definition}</p><p className="hero-example">“{word.example}”</p><button type="button" className="hero-hide-meaning" onClick={() => setRevealed(false)}><RotateCcw size={11} />Try recalling it again</button></div> : <div className="hero-reveal-prompt"><div className="hero-recall-icon" aria-hidden="true"><Layers size={22} strokeWidth={1.5} /></div><p>You might know the word.<br />Can you find its meaning?</p><button type="button" className="hero-reveal-button" onClick={() => { setRevealed(true); discoverWord(); }}>Reveal meaning<Sparkles size={13} /></button></div> : <><p className="mb-3 text-xs text-muted-foreground">Which meaning fits this word?</p><div className="space-y-2">{word.options.map((option, optionIndex) => <motion.button type="button" key={option} disabled={selected !== null} whileHover={reduceMotion ? undefined : { x: 3 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }} transition={transition} className={`hero-answer ${selected !== null && optionIndex === word.answer ? "hero-answer-correct" : selected === optionIndex ? "hero-answer-incorrect" : ""}`} onClick={() => { setAnswers((current) => ({ ...current, [index]: optionIndex })); discoverWord(); if (optionIndex === word.answer) setCelebration((current) => current + 1); }}>{option}<span>{selected !== null && optionIndex === word.answer ? <Check size={14} /> : String.fromCharCode(65 + optionIndex)}</span></motion.button>)}</div><motion.p key={selected ?? "unanswered"} role="status" className={`hero-answer-feedback ${selected === word.answer ? "hero-feedback-correct" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transition}>{selected === null ? "Choose an answer to check your understanding." : selected === word.answer ? "You’ve got it! That’s a word worth keeping." : "A little discovery: the right meaning is highlighted."}</motion.p></>}
          </motion.div>
        </AnimatePresence></div>
      </motion.div>
      </AnimatePresence>
      </div>
      <div className="hero-demo-footer"><span className="text-xs text-muted-foreground" aria-live="polite">0{index + 1}<span className="mx-2 opacity-50">/</span>0{words.length}</span><div className="hero-word-dots" aria-label="Preview words">{words.map((item, wordIndex) => <button key={item.word} type="button" aria-label={`Study ${item.word}`} aria-current={index === wordIndex ? "step" : undefined} className={discovered.includes(wordIndex) ? "hero-dot-discovered" : ""} onClick={() => goToWord(wordIndex, wordIndex >= index ? 1 : -1)}><span /></button>)}</div><div className="flex gap-2"><button type="button" aria-label="Previous word" onClick={() => changeWord(-1)}><ArrowLeft size={15} /></button><button type="button" aria-label="Next word" onClick={() => changeWord(1)}><ArrowRight size={15} /></button></div></div>
      <div className="hero-discovery-track" role="progressbar" aria-label="Words discovered" aria-valuemin={0} aria-valuemax={words.length} aria-valuenow={discovered.length}><motion.span animate={{ width: `${discovered.length / words.length * 100}%` }} transition={{ duration: reduceMotion ? 0 : 0.5 }} /></div>
      <div className="hero-celebration" aria-hidden="true">{celebration > 0 && !reduceMotion && <div key={celebration}>{Array.from({ length: 9 }, (_, particle) => <motion.span key={particle} style={{ left: `${15 + particle * 8}%`, backgroundColor: ["#7aa5ff", "#67bf9b", "#e9c46b"][particle % 3] }} initial={{ opacity: 1, y: 0, rotate: 0, scale: 0.5 }} animate={{ opacity: 0, y: -100 - (particle % 3) * 25, x: (particle - 4) * 12, rotate: particle * 55, scale: 1 }} transition={{ duration: 0.9, ease: "easeOut" }} />)}</div>}</div>
    </motion.section>
    </div>
    <div className="hero-progress-note" data-complete={complete}><motion.span className="hero-progress-icon" key={discovered.length} initial={{ scale: reduceMotion ? 1 : 0.7 }} animate={{ scale: 1 }} transition={transition}>{complete ? <Check size={18} /> : <TrendingUp size={18} />}</motion.span><div aria-live="polite"><p className="text-xs font-semibold">{complete ? "Three words. New possibilities." : discovered.length ? `${discovered.length} ${discovered.length === 1 ? "word" : "words"} discovered. Keep going!` : "Your next discovery awaits."}</p><p className="mt-1 text-[10px] text-muted-foreground">{complete ? "A little curiosity goes a long way." : `${discovered.length} of ${words.length} words explored in this preview`}</p></div><button type="button" className="hero-restart-preview" aria-label="Restart vocabulary preview" onClick={restart}><RotateCcw size={14} /></button></div>
    <p className="hero-preview-caption">Go ahead, try a word. Curiosity looks good on you.</p>
  </div></MotionConfig>;
}

export default function HeroPage() {
  const { user } = useAuth();
  if (user) return <Redirect to={user.role === "educator" ? "/educator/dashboard" : "/learner/dashboard"} />;

  return <div className="hero-landing">
    <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-4">Skip to content</a>
    <header className="hero-nav">
      <Link to="/" aria-label="Checkit home"><Brand /></Link>
      <nav aria-label="Main navigation" className="flex items-center gap-3 sm:gap-8">
        <a href="#features" className="hidden text-xs font-medium text-muted-foreground transition-colors hover:text-primary sm:block">Why Checkit</a>
        <a href="#how-it-works" className="hidden text-xs font-medium text-muted-foreground transition-colors hover:text-primary md:block">How it works</a>
        <ThemeToggle />
        <Link to="/auth" className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary max-[380px]:hidden">Sign in</Link>
        <Button asChild className="h-10 rounded-full px-4 text-xs sm:px-5"><Link to="/auth?mode=register">Get started<ArrowUpRight size={14} className="ml-2 hidden sm:block" /></Link></Button>
      </nav>
    </header>
    <main id="main">
      <section className="hero-main" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <div className="hero-eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-primary" />LESS MEMORIZING. MORE DISCOVERING.</div>
          <h1 id="hero-heading">Small words.<br />Big <span className="hero-headline-accent">possibilities.</span></h1>
          <p className="hero-description">Turn what you read into what you know. A brighter way to build vocabulary, grow confidence, and make every new word your own.</p>
          <div className="hero-actions"><Button asChild className="h-12 rounded-full px-7 text-sm"><Link to="/auth?mode=register">Start your next chapter<ArrowRight size={16} className="ml-3" /></Link></Button><a href="#preview" className="hero-try-link">Try a little learning<ChevronRight size={15} /></a></div>
          <div className="hero-audience"><span className="hero-audience-icon"><GraduationCap size={18} /></span><p>Made for curious learners.<br /><span className="text-foreground font-medium">And the educators who inspire them.</span></p></div>
        </div>
        <div id="preview" className="hero-preview-anchor"><VocabularyPreview /></div>
      </section>
      <section id="features" className="hero-features" aria-label="Why learn with Checkit">
        {features.map(({ icon: Icon, title, description }, index) => <article key={title} className="hero-feature"><div className={`hero-feature-icon hero-feature-icon-${index}`}><Icon size={21} strokeWidth={1.6} /></div><div><h2 className="text-sm font-semibold tracking-[-0.02em]">{title}</h2><p className="mt-2 max-w-[270px] text-xs leading-6 text-muted-foreground">{description}</p></div></article>)}
      </section>
      <section className="landing-section landing-context" aria-labelledby="context-heading">
        <div className="landing-passage-scene">
          <div className="landing-passage">
            <div className="landing-preview-label"><BookOpen size={15} /><span>A MOMENT IN A STORY</span><span className="ml-auto text-muted-foreground">Sample passage</span></div>
            <h3>The unexpected detour</h3>
            <p>She took the long way home, following her <mark>curiosity</mark> down a quiet street. A tiny bookshop stood between the trees, its windows full of stories.</p>
            <p>Inside, she found the very book her grandmother used to read. It was a moment of pure <mark className="landing-mark-blue">serendipity</mark>.</p>
            <div className="landing-passage-bottom"><span className="flex items-center gap-2"><PenLine size={13} />Every word has a story.</span><span>02 words to explore</span></div>
          </div>
          <div className="landing-definition"><span className="hero-feature-icon"><Sparkles size={19} /></span><div><h4>serendipity <span>noun</span></h4><p>An unexpected, happy discovery.</p></div><Check size={17} className="ml-auto shrink-0 text-primary" /></div>
        </div>
        <div className="landing-section-copy">
          <p className="hero-eyebrow">BEYOND THE DEFINITION</p>
          <h2 id="context-heading">Words mean more<br />when they <em>belong.</em></h2>
          <p>A word on a list is a starting point. A word in a story is a connection. Checkit brings vocabulary back to the passages, ideas, and moments that give it meaning.</p>
          <ul className="landing-checklist"><li><Check size={15} />Learn from real reading passages</li><li><Check size={15} />Connect definitions to the bigger picture</li><li><Check size={15} />Build understanding you can return to</li></ul>
          <a href="#preview" className="landing-text-link">Discover a word for yourself<ArrowRight size={15} /></a>
        </div>
      </section>

      <section id="how-it-works" className="landing-workflow" aria-labelledby="workflow-heading">
        <div className="landing-section">
          <div className="landing-section-heading"><p className="hero-eyebrow">A LITTLE RHYTHM TO YOUR LEARNING</p><h2 id="workflow-heading">From “new to me” to <em>“I know this.”</em></h2><p>No complicated routine. Just a simple path from your first encounter with a word to a little more confidence using it.</p></div>
          <ol className="landing-steps">{steps.map(({ icon: Icon, title, description, detail }, index) => <li key={title}><div className="landing-step-top"><span className="landing-step-number">0{index + 1}</span><Icon size={25} strokeWidth={1.5} /></div><h3>{title}</h3><p>{description}</p><span className="landing-step-detail">{detail}</span></li>)}</ol>
          <div className="landing-workflow-bottom"><span className="flex items-center gap-2"><Sparkles size={15} />A few new words can change how you see a whole story.</span><a href="/auth?mode=register" className="landing-text-link">Let’s get started<ArrowUpRight size={15} /></a></div>
        </div>
      </section>

      <section id="for-you" className="landing-section landing-for-you" aria-labelledby="audience-heading">
        <div className="landing-section-heading"><p className="hero-eyebrow">BETTER TOGETHER</p><h2 id="audience-heading">A place to teach.<br />A space to <em>grow.</em></h2><p>Different sides of the classroom. The same spark of discovery.</p></div>
        <div className="landing-audience-grid">
          <article className="landing-audience-card landing-educator"><span className="landing-audience-tag"><Users size={15} />FOR EDUCATORS</span><h3>More teaching moments.<br />Less busywork.</h3><p>Bring your reading material, your classes, and your vocabulary assignments together in one thoughtful workspace.</p><ul className="landing-checklist"><li><Check size={15} />Create and share vocabulary assignments</li><li><Check size={15} />Organize classes in one place</li><li><Check size={15} />Review results and guide the next step</li></ul><Link to="/auth?mode=register" className="landing-text-link">Make room for discovery<ArrowUpRight size={15} /></Link><div className="landing-class-preview" aria-label="Example class overview"><div className="flex items-center gap-3"><span className="hero-feature-icon"><Users size={18} /></span><div><p className="font-semibold">Your classroom, connected.</p><span className="text-[10px] text-muted-foreground">An example of what you can organize</span></div></div><div className="landing-class-row"><span><BookOpen size={14} />Reading & discovery</span><span className="landing-small-tag">Vocabulary</span></div><div className="landing-class-row"><span><Layers size={14} />Words to revisit</span><span className="landing-small-tag">Practice</span></div></div></article>
          <article className="landing-audience-card landing-learner"><span className="landing-audience-tag"><GraduationCap size={15} />FOR LEARNERS</span><h3>Your pace.<br />Your next possibility.</h3><p>Make unfamiliar words feel familiar. Explore, practice, and find a study rhythm that works for you.</p><ul className="landing-checklist"><li><Check size={15} />Revisit words with interactive flashcards</li><li><Check size={15} />Put your knowledge into practice</li><li><Check size={15} />See your results and keep moving forward</li></ul><Link to="/auth?mode=register" className="landing-text-link">Find your learning rhythm<ArrowUpRight size={15} /></Link><div className="landing-word-preview" aria-label="Example study words"><span className="landing-small-tag">A LITTLE COLLECTION OF POSSIBILITIES</span><div><span>curiosity</span><span>resilient</span><span>serendipity</span></div><p><Sparkles size={13} />Words to learn. Ideas to carry with you.</p></div></article>
        </div>
      </section>

      <section className="landing-section landing-faq" aria-labelledby="faq-heading">
        <div className="landing-section-copy"><p className="hero-eyebrow">A FEW THINGS YOU MIGHT WONDER</p><h2 id="faq-heading">Curiosity<br />starts with <em>questions.</em></h2><p>Here are a few answers to help you find your feet.</p><a href="#how-it-works" className="landing-text-link">Take another look around<ArrowRight size={15} /></a></div>
        <div className="landing-questions">{questions.map(({ question, answer }) => <details key={question}><summary>{question}<Plus size={17} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div>
      </section>

      <section className="landing-section landing-closing" aria-labelledby="closing-heading"><span className="landing-closing-spark" aria-hidden="true">✳</span><p className="hero-eyebrow">THERE’S A WHOLE WORLD IN A WORD</p><h2 id="closing-heading">Your next chapter<br />starts with <em>one word.</em></h2><p>A little curiosity today. A little more confidence tomorrow.<br />Let’s see where learning takes you.</p><Button asChild className="h-12 rounded-full bg-white px-7 text-sm text-blue-700 hover:bg-blue-50"><Link to="/auth?mode=register">Find your first discovery<MoveUpRight size={16} className="ml-3" /></Link></Button><span className="landing-closing-caption">For the ones who teach. For the ones who never stop learning.</span></section>
    </main>
    <footer className="hero-footer"><div><Link to="/" aria-label="Checkit home"><Brand /></Link><p className="mt-3">Good words take you places.</p></div><nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-5"><a href="#features">Why Checkit</a><a href="#how-it-works">How it works</a><a href="#for-you">Made for you</a><Link to="/auth">Sign in</Link></nav><span className="flex items-center gap-2"><Sparkles size={12} className="text-primary" />A little more curious, every day.</span></footer>
  </div>;
}
