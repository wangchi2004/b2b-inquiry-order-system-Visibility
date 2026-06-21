export function EmailCampaignPreview({
  subject,
  html
}: {
  subject: string;
  html: string;
}) {
  return (
    <section className="border border-slate-200 bg-white p-5">
      <div className="border-b border-slate-200 pb-4">
        <p className="text-xs font-semibold uppercase text-slate-500">
          Subject / 邮件标题
        </p>
        <p className="mt-1 break-words font-semibold text-slate-950">{subject}</p>
      </div>
      <div className="mt-4 overflow-hidden border border-slate-200 bg-slate-50">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </section>
  );
}
