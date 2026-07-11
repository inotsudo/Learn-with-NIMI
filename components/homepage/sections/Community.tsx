import Section from "@/components/homepage/ui/Section";
import Container from "@/components/homepage/ui/Container";

// TODO: Implement Community section (creations feed, social proof, join CTA).
export default function Community() {
  return (
    <Section id="community" bg="cream">
      <Container>
        <div className="flex items-center justify-center min-h-[180px] rounded-2xl border-2 border-dashed border-amber-200">
          <p className="font-nunito text-gray-400 text-sm">[ Community section — coming soon ]</p>
        </div>
      </Container>
    </Section>
  );
}
