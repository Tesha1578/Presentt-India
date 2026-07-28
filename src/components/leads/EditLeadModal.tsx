import { useEffect, useState } from 'react';
import GlassModal from '@/components/GlassModal';
import { useToasts } from '@/components/Toasts';
import { trpc } from '@/lib/trpc-shim';
import type { Lead, LeadStage, Priority } from '@contracts/types';
import { LeadStages } from '@contracts/constants';
import {
  GhostButton,
  LimeButton,
  LeadStageLabels,
  PriorityLabels,
  REGION_OPTIONS,
  inputCls,
} from '@/components/leads/leads-ui';

interface EditLeadModalProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditLeadModal({ lead, open, onClose, onSuccess }: EditLeadModalProps) {
  const { push } = useToasts();
  const utils = trpc.useUtils();
  const updateMutation = trpc.leads.update.useMutation();

  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [stage, setStage] = useState<LeadStage>('lead_in');
  const [priority, setPriority] = useState<Priority>('medium');

  useEffect(() => {
    if (lead) {
      setCompanyName(lead.companyName ?? '');
      setContactPerson(lead.contactPerson ?? '');
      setDesignation(lead.designation ?? '');
      setPhone(lead.phone ?? '');
      setEmail(lead.email ?? '');
      setRegion(lead.region ?? '');
      setStage(lead.stage ?? 'lead_in');
      setPriority(lead.priority ?? 'medium');
    }
  }, [lead]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    try {
      await updateMutation.mutateAsync({
        id: lead.id,
        companyName,
        contactPerson,
        designation,
        phone,
        email,
        region,
        stage,
        priority,
      });

      push({ type: 'success', title: 'Lead Updated', body: `Saved changes for ${companyName || 'Lead'}` });
      utils.leads.list.invalidate();
      utils.leads.byId.invalidate({ id: lead.id });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      push({ type: 'error', title: 'Update Failed', body: err?.message ?? 'Could not save lead changes' });
    }
  };

  if (!lead) return null;

  return (
    <GlassModal open={open} onClose={onClose} title="Edit Lead Details" width="560px">
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="metadata mb-1 block">Company Name</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="metadata mb-1 block">Contact Person</label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="metadata mb-1 block">Designation</label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="metadata mb-1 block">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="metadata mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="metadata mb-1 block">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={inputCls}
            >
              <option value="">Select region</option>
              {REGION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="metadata mb-1 block">Stage</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as LeadStage)}
              className={inputCls}
            >
              {LeadStages.map((s) => (
                <option key={s} value={s}>
                  {LeadStageLabels[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="metadata mb-1 block">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className={inputCls}
            >
              {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {PriorityLabels[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-line pt-4">
          <GhostButton type="button" onClick={onClose}>
            Cancel
          </GhostButton>
          <LimeButton type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </LimeButton>
        </div>
      </form>
    </GlassModal>
  );
}
