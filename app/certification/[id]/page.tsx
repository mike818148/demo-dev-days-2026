import { CertificationDetail } from "@/components/component/certification-detail";

interface CertificationDetailPageProps {
  params: {
    id: string;
  };
}

export default function CertificationDetailPage({
  params,
}: CertificationDetailPageProps) {
  return (
    <div className="w-full p-6">
      <CertificationDetail certificationId={params.id} />
    </div>
  );
}
