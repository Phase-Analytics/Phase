'use client';

import { UserAdd01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAddTeamMember } from '@/lib/queries';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AddMemberDialogProps = {
  appId: string;
  children?: React.ReactNode;
};

export function AddMemberDialog({ appId, children }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const addMember = useAddTeamMember();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Email is required');
      return;
    }

    // Basic email validation
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    addMember.mutate(
      { appId, data: { email: trimmedEmail } },
      {
        onSuccess: () => {
          setOpen(false);
          setEmail('');
          setError(null);
        },
        onError: (err) => {
          setError(err.message || 'Failed to add team member');
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setEmail('');
      setError(null);
      addMember.reset();
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (error) {
      setError(null);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        {children || (
          <Button type="button" variant="default">
            <HugeiconsIcon className="mr-2 size-4" icon={UserAdd01Icon} />
            Add Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Enter the email address of the user you want to add to your team.
            They must have a Telemetra account.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="member-email">
              Email Address
            </label>
            <Input
              autoComplete="off"
              disabled={addMember.isPending}
              id="member-email"
              onChange={(event) => handleEmailChange(event.target.value)}
              placeholder="member@example.com"
              type="text"
              value={email}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              disabled={addMember.isPending}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={addMember.isPending} type="submit">
              {addMember.isPending && <Spinner className="mr-2 size-4" />}
              {addMember.isPending ? 'Adding' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
