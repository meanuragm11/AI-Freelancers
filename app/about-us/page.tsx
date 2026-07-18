import AboutPage from '@/components/about/AboutPage';
import { aboutPageMetadata } from '@/lib/seo/pages';

export const metadata = aboutPageMetadata;

export default function AboutUsPage() {
  return (
    <AboutPage
      title="About Zelance"
      subtitle="Building the Future of AI Work, One Project at a Time"
      intro={
        <>
          <p>
            Artificial Intelligence is changing the way the world builds products, automates businesses, and solves complex problems. Yet hiring the right AI expert remains slow, expensive, and uncertain. Businesses struggle to find trusted talent, while skilled AI builders often spend more time searching for opportunities than actually creating.
          </p>
          <p>Zelance was built to change that.</p>
          <p>
            We&apos;re creating a dedicated AI-first marketplace where businesses can hire verified AI experts, AI engineers, prompt engineers, automation specialists, and creative builders through a secure, transparent, and outcome-focused platform.
          </p>
          <p>
            Unlike traditional freelancing websites built for every profession, Zelance is designed specifically for the rapidly growing AI economy.
          </p>
          <p>
            Whether you&apos;re building an AI SaaS product, automating business operations, creating AI agents, fine-tuning large language models, generating content, or deploying enterprise AI solutions, Zelance connects you with specialists who focus exclusively on artificial intelligence.
          </p>
        </>
      }
      sections={[
        {
          id: 'our-mission',
          title: 'Our Mission',
          content: (
            <>
              <p>Our mission is simple:</p>
              <p>Make hiring AI talent as easy, transparent, and trustworthy as hiring a teammate.</p>
              <p>
                We believe every startup, founder, creator, and business—regardless of size—should have access to world-class AI expertise without spending weeks searching, interviewing, or worrying about project security.
              </p>
              <p>
                At the same time, talented AI professionals deserve a platform where their skills are valued, their work is protected, and they can build meaningful careers doing what they love.
              </p>
            </>
          ),
        },
        {
          id: 'why-zelance-exists',
          title: 'Why Zelance Exists',
          content: (
            <>
              <p>The AI industry is evolving faster than any technology in history.</p>
              <p>Every day, thousands of companies are looking for experts who can build:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>AI Agents</li>
                <li>Generative AI applications</li>
                <li>Chatbots</li>
                <li>RAG systems</li>
                <li>Workflow automations</li>
                <li>AI voice assistants</li>
                <li>Computer vision solutions</li>
                <li>AI content generation</li>
                <li>AI image and video generation</li>
                <li>Prompt engineering solutions</li>
                <li>Custom machine learning models</li>
                <li>AI integrations</li>
                <li>Enterprise AI products</li>
              </ul>
              <p>Traditional freelance marketplaces weren&apos;t built specifically for this new world.</p>
              <p>
                Finding genuine AI specialists often means filtering through thousands of unrelated profiles, generic portfolios, and inconsistent pricing.
              </p>
              <p>Zelance removes that friction by focusing entirely on the AI ecosystem.</p>
            </>
          ),
        },
        {
          id: 'what-makes-zelance-different',
          title: 'What Makes Zelance Different',
          content: null,
        },
        {
          id: 'ai-first-marketplace',
          title: 'AI-First Marketplace',
          level: 3,
          content: (
            <>
              <p>Everything on Zelance revolves around Artificial Intelligence.</p>
              <p>
                From prompt engineering to enterprise AI automation, every service, project, and expert is part of the AI ecosystem.
              </p>
              <p>Businesses don&apos;t need to search through unrelated categories—they find exactly the expertise they need.</p>
            </>
          ),
        },
        {
          id: 'secure-project-collaboration',
          title: 'Secure Project Collaboration',
          level: 3,
          content: (
            <>
              <p>
                Building AI products often involves confidential business ideas, proprietary datasets, and sensitive workflows.
              </p>
              <p>That&apos;s why secure collaboration is at the heart of Zelance.</p>
              <p>
                Our platform is designed to provide structured project workflows, milestone-based collaboration, transparent communication, and protected payment experiences, giving both buyers and builders greater confidence throughout every project.
              </p>
            </>
          ),
        },
        {
          id: 'built-for-results',
          title: 'Built for Results',
          level: 3,
          content: (
            <>
              <p>Hiring should never feel like gambling.</p>
              <p>
                Zelance is designed to help businesses make informed decisions through detailed expert profiles, portfolios, project history, transparent pricing, proposal workflows, and structured collaboration.
              </p>
              <p>The goal isn&apos;t simply to complete projects.</p>
              <p>It&apos;s to build long-term professional relationships.</p>
            </>
          ),
        },
        {
          id: 'open-projects-marketplace',
          title: 'Open Projects Marketplace',
          level: 3,
          content: (
            <>
              <p>Sometimes businesses don&apos;t know exactly who to hire.</p>
              <p>
                Instead of searching manually, buyers can publish an open project, receive competitive proposals from qualified AI experts, compare bids, review portfolios, and select the builder who best matches their goals.
              </p>
              <p>This creates a fair marketplace where great work speaks louder than algorithms.</p>
            </>
          ),
        },
        {
          id: 'ai-services-marketplace',
          title: 'AI Services Marketplace',
          level: 3,
          content: (
            <>
              <p>
                For businesses that already know what they need, builders can publish ready-to-purchase AI services with fixed pricing, clear deliverables, timelines, and optional add-ons.
              </p>
              <p>This makes purchasing AI solutions faster, simpler, and more predictable.</p>
            </>
          ),
        },
        {
          id: 'growing-ai-solution-ecosystem',
          title: 'Unified AI Solution Marketplace',
          level: 3,
          content: (
            <>
              <p>Our vision extends beyond freelance services.</p>
              <p>
                We&apos;re building a unified marketplace where creators publish and monetize AI Solutions — fixed-price listings with secure fulfillment, clear deliverables, and instant digital access after purchase.
              </p>
            </>
          ),
        },
        {
          id: 'who-uses-zelance',
          title: 'Who Uses Zelance?',
          content: null,
        },
        {
          id: 'startups',
          title: 'Startups',
          level: 3,
          content: (
            <p>Launch AI products faster without building a full in-house team.</p>
          ),
        },
        {
          id: 'businesses',
          title: 'Businesses',
          level: 3,
          content: (
            <p>Automate workflows, reduce operational costs, and adopt AI confidently.</p>
          ),
        },
        {
          id: 'enterprises',
          title: 'Enterprises',
          level: 3,
          content: (
            <p>Scale AI initiatives with specialized experts for complex projects.</p>
          ),
        },
        {
          id: 'creators',
          title: 'Creators',
          level: 3,
          content: (
            <p>Build AI-powered content, automation, and digital experiences.</p>
          ),
        },
        {
          id: 'ai-builders',
          title: 'AI Builders',
          level: 3,
          content: (
            <p>Find meaningful projects, grow your portfolio, and build a sustainable freelance business focused entirely on AI.</p>
          ),
        },
        {
          id: 'our-values',
          title: 'Our Values',
          content: null,
        },
        {
          id: 'quality-over-quantity',
          title: 'Quality Over Quantity',
          level: 3,
          content: (
            <p>
              We believe a smaller community of exceptional AI professionals creates better outcomes than a marketplace filled with unrelated services.
            </p>
          ),
        },
        {
          id: 'transparency',
          title: 'Transparency',
          level: 3,
          content: (
            <p>Clear pricing, structured workflows, and open communication create trust between buyers and builders.</p>
          ),
        },
        {
          id: 'innovation',
          title: 'Innovation',
          level: 3,
          content: (
            <>
              <p>Artificial Intelligence evolves every day.</p>
              <p>So do we.</p>
              <p>
                We continuously improve Zelance to support emerging AI technologies, workflows, and business needs.
              </p>
            </>
          ),
        },
        {
          id: 'security',
          title: 'Security',
          level: 3,
          content: (
            <>
              <p>Professional collaboration requires confidence.</p>
              <p>
                We prioritize secure authentication, responsible data handling, payment protection, and platform integrity.
              </p>
            </>
          ),
        },
        {
          id: 'community',
          title: 'Community',
          level: 3,
          content: (
            <>
              <p>We&apos;re not building another freelancing website.</p>
              <p>We&apos;re building the home of the global AI builder community.</p>
            </>
          ),
        },
        {
          id: 'our-vision',
          title: 'Our Vision',
          content: (
            <>
              <p>We believe the next generation of companies won&apos;t just hire software developers.</p>
              <p>They&apos;ll hire AI specialists.</p>
              <p>Prompt engineers.</p>
              <p>Agent developers.</p>
              <p>Automation architects.</p>
              <p>Model fine-tuners.</p>
              <p>AI product designers.</p>
              <p>And they&apos;ll need a platform built specifically for that future.</p>
              <p>
                Our vision is to become the world&apos;s most trusted marketplace for AI talent—where businesses discover exceptional experts, builders build meaningful careers, and innovative AI products come to life.
              </p>
            </>
          ),
        },
        {
          id: 'this-is-just-the-beginning',
          title: 'This Is Just the Beginning',
          content: (
            <>
              <p>Zelance is constantly evolving.</p>
              <p>
                New marketplace features, collaboration tools, AI assets, enterprise capabilities, and community experiences are continuously being developed to make hiring and building with AI even easier.
              </p>
              <p>
                We&apos;re excited to grow alongside the AI revolution—and we&apos;d love for you to be part of that journey.
              </p>
              <p>
                Whether you&apos;re looking to build your next AI product or showcase your expertise to the world, welcome to Zelance.
              </p>
              <p>Let&apos;s build the future of AI, together.</p>
            </>
          ),
        },
      ]}
    />
  );
}
