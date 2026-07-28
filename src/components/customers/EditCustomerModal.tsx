import { useEffect, useState } from 'react';
import GlassModal from '@/components/GlassModal';
import { useToasts } from '@/components/Toasts';
import { trpc } from '@/lib/trpc-shim';
import type { CustomerDetail } from '@/components/customers/utils';

interface EditCustomerModalProps {
  customer: CustomerDetail | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const inputCls =
  'w-full rounded-[14px] border border-line bg-surface-2 px-3.5 py-2.5 text-[13px] text-primary placeholder:text-muted focus:border-accent focus:outline-none';

export default function EditCustomerModal({ customer, open, onClose, onSuccess }: EditCustomerModalProps) {
  const { push } = useToasts();
  const utils = trpc.useUtils();

  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [industry, setIndustry] = useState('');
  const [primaryContact, setPrimaryContact] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    if (customer) {
      setName(customer.name ?? '');
      setRegion(customer.region ?? '');
      setCity(customer.city ?? '');
      setIndustry(customer.industry ?? '');
      setPrimaryContact(customer.primaryContact ?? '');
      setContactEmail(customer.contactEmail ?? '');
      setContactPhone(customer.contactPhone ?? '');
    }
  }, [customer]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    try {
      push({ type: 'success', title: 'Customer Updated', body: `Saved changes for ${name}` });
      utils.customers.list.invalidate();
      utils.customers.byId.invalidate({ id: customer.id });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      push({ type: 'error', title: 'Update Failed', body: err?.message ?? 'Could not save customer changes' });
    }
  };

  if (!customer) return null;

  return (
    <GlassModal open={open} onClose={onClose} title="Edit Customer Details" width="560px">
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="metadata mb-1 block">Customer / Company Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="metadata mb-1 block">Primary Contact</label>
            <input
              type="text"
              value={primaryContact}
              onChange={(e) => setPrimaryContact(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="metadata mb-1 block">Industry</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="metadata mb-1 block">Region</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="metadata mb-1 block">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="metadata mb-1 block">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="metadata mb-1 block">Contact Phone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-5 py-2.5 text-[13px] font-semibold text-secondary hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-accent-foreground shadow-accent-glow hover:shadow-lg"
          >
            Save Changes
          </button>
        </div>
      </form>
    </GlassModal>
  );
}
