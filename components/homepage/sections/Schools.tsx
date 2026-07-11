import Section from "@/components/homepage/ui/Section";
import Container from "@/components/homepage/ui/Container";

// TODO: Implement Schools section (educator features, classroom tools, CTA to /schools).
export default function Schools() {
  return (
    <Section id="schools">
      <Container>
        <div className="flex items-center justify-center min-h-[180px] rounded-2xl border-2 border-dashed border-gray-200">
          <p className="font-nunito text-gray-400 text-sm">[ Schools section — coming soon ]</p>
        </div>
      </Container>
    </Section>
  );
}
