"use client";

import { GraduationCap, BarChart2, Users2, Award } from "lucide-react";
import Section from "@/components/homepage/ui/Section";
import Container from "@/components/homepage/ui/Container";
import Button from "@/components/homepage/ui/Button";

const PERKS = [
  { icon: Users2,       title: "Class management",  desc: "Add all your students, track each child's progress individually." },
  { icon: BarChart2,    title: "Progress reports",   desc: "Weekly reports per learner — vocabulary, missions, time spent." },
  { icon: Award,        title: "Printable certificates", desc: "Auto-generated certificates when a student completes a story level." },
  { icon: GraduationCap, title: "Curriculum-aligned", desc: "Mapped to Rwanda national language learning standards for P1–P6." },
];

export default function Schools() {
  return (
    <Section id="schools" bg="cream">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 font-nunito font-bold text-xs tracking-wider uppercase px-4 py-1.5 rounded-full mb-4">
              <GraduationCap className="w-3.5 h-3.5" /> For Schools
            </span>
            <h2 className="font-baloo font-black text-gray-900 text-3xl sm:text-4xl leading-tight" style={{textWrap:"balance"}}>
              Built for <span className="text-nimi-green">classrooms</span>, loved by teachers
            </h2>
            <p className="font-nunito text-gray-600 mt-4 leading-relaxed text-sm sm:text-base max-w-md">
              NIMIPIKO gives Rwanda's primary school teachers a ready-to-use language lab — no setup, no hardware needed.
            </p>
            <div className="mt-8 space-y-4">
              {PERKS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-baloo font-black text-gray-900 text-sm">{title}</p>
                    <p className="font-nunito text-gray-500 text-xs mt-0.5 leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-8 flex-wrap">
              <Button href="/schools" variant="primary">Request School Access</Button>
              <Button href="/schools" variant="secondary">See Pricing</Button>
            </div>
          </div>

          {/* Stats panel */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "500+", label: "Schools reached", color: "bg-blue-50 border-blue-100" },
              { value: "12K+", label: "Students active", color: "bg-emerald-50 border-emerald-100" },
              { value: "3",    label: "Languages covered", color: "bg-amber-50 border-amber-100" },
              { value: "98%",  label: "Teacher satisfaction", color: "bg-purple-50 border-purple-100" },
            ].map(({ value, label, color }) => (
              <div key={label} className={`${color} border rounded-2xl p-6 text-center`}>
                <p className="font-baloo font-black text-gray-900 text-3xl">{value}</p>
                <p className="font-nunito text-gray-500 text-xs font-bold mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
