import { EMPTY_PORTFOLIO_FORM, formToPortfolioInput, type PortfolioFormState } from "@/lib/portfolio";
import { EMPTY_SERVICE_FORM, type ServiceFormState } from "@/lib/services/form";

export const ONBOARDING_COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "India",
  "Germany",
  "France",
  "Japan",
  "Singapore",
  "Netherlands",
  "Brazil",
  "Switzerland",
  "United Arab Emirates",
  "Sweden",
  "Israel",
  "South Korea",
  "Spain",
  "Italy",
  "Other",
] as const;

export const ONBOARDING_SKILL_SUGGESTIONS = [
  "Generative AI",
  "Prompt Engineering",
  "AI Agent Development",
  "Agentic AI",
  "AI Automation",
  "AI Workflow Design",
  "LLM Integration",
  "RAG Architecture",
  "Fine-Tuning (LoRA/QLoRA)",
  "Model Evaluation",
  "Model Distillation",
  "AI Chatbot Development",
  "AI Voice Agents",
  "AI Video Generation",
  "AI Image Generation",
  "AI Content Creation",
  "AI Product Development",
  "LangChain",
  "LlamaIndex",
  "CrewAI",
  "AutoGen",
  "LangGraph",
  "Semantic Kernel",
  "Haystack",
  "OpenAI API",
  "Anthropic API",
  "Google Gemini API",
  "Groq API",
  "Mistral API",
  "DeepSeek API",
  "Python",
  "FastAPI",
  "Node.js",
  "React",
  "Next.js",
  "TypeScript",
  "Other (Custom)",
] as const;

export type OnboardingProfileState = {
  full_name: string;
  headline: string;
  location: string;
  bio: string;
  tech_stack: string[];
  portfolioProjects: PortfolioFormState[];
};

export const EMPTY_ONBOARDING_PROFILE: OnboardingProfileState = {
  full_name: "",
  headline: "",
  location: ONBOARDING_COUNTRIES[4],
  bio: "",
  tech_stack: [],
  portfolioProjects: [],
};

export function validateOnboardingProfileStep(profile: OnboardingProfileState): string[] {
  const errors: string[] = [];
  if (!profile.full_name.trim()) errors.push("Full name is required.");
  if (!profile.headline.trim()) errors.push("Professional headline is required.");
  if (!profile.location.trim()) errors.push("Location is required.");
  if (!profile.bio.trim()) errors.push("Professional bio is required.");
  if (profile.tech_stack.length === 0) errors.push("Add at least one skill.");
  return errors;
}

export function buildOnboardingServiceInitialForm(profile: OnboardingProfileState): ServiceFormState {
  return {
    ...EMPTY_SERVICE_FORM,
    short_description: profile.headline.trim(),
    detailed_description: profile.bio.trim(),
    ai_skills: [...profile.tech_stack],
  };
}

export function profileToDraftPayload(userId: string, profile: OnboardingProfileState) {
  return {
    id: userId,
    full_name: profile.full_name.trim(),
    headline: profile.headline.trim(),
    location: profile.location.trim(),
    bio: profile.bio.trim(),
    tech_stack: profile.tech_stack,
  };
}

export function portfolioFormsToInputs(projects: PortfolioFormState[]) {
  return projects.map((project) => ({
    id: project.id,
    input: formToPortfolioInput(project),
  }));
}

export function createEmptyPortfolioProject(): PortfolioFormState {
  return { ...EMPTY_PORTFOLIO_FORM, links: [{ title: "Live Demo", url: "" }] };
}
