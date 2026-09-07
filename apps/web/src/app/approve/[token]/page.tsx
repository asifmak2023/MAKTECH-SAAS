import ApprovalClient from "./ApprovalClient";

export default function ApprovePage({ params }: { params: { token: string } }) {
  return <ApprovalClient token={params.token} />;
}
