import AttachmentManager from "./Attachments";

interface AttachmentListProps {
  attachments: any[];
}

export default function AttachmentList({ attachments }: AttachmentListProps) {
  return <AttachmentManager attachments={attachments} />;
}
