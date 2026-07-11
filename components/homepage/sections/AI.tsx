import Section from "@/components/homepage/ui/Section";
import Container from "@/components/homepage/ui/Container";

// TODO: Implement AI section (Nimi AI tutor feature highlights, Talk-to-Nimi CTA).
export default function AI() {
  return (
    <Section id="ai" bg="cream">
      <Container>
        <div className="flex items-center justify-center min-h-[180px] rounded-2xl border-2 border-dashed border-amber-200">
          <p className="font-nunito text-gray-400 text-sm">[ AI section — coming soon ]</p>
        </div>
      </Container>
    </Section>
  );
}
