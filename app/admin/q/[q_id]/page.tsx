import PrintQ from "@/app/admin/q/[q_id]/PrintQPage";

const page = ({ params: { q_id } }: { params: { q_id: string } }) => {
  return <PrintQ queueId={q_id} />;
};

export default page;
