import { auth } from '@/auth'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/app/page-header'
import { SignOutButton } from '@/components/app/sign-out-button'
import { DeleteAccountButton } from '@/components/app/delete-account-button'

const preferences = [
  { label: 'Default language',   value: 'English'        },
  { label: 'Default level',      value: 'Intermediate'   },
  { label: 'Default lesson time',value: '20 minutes'     },
  { label: 'Teaching style',     value: 'Structured'     },
]

export default async function SettingsPage() {
  const session = await auth()
  const user = session?.user

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your profile and learning preferences."
      />

      {/* Profile */}
      <Card>
        <CardContent className="flex flex-col gap-5 p-6">
          <h2 className="font-semibold">Profile</h2>
          <div className="flex items-center gap-4">
            {user?.image ? (
              <Image
                src={user.image}
                alt={user.name ?? 'Avatar'}
                width={56}
                height={56}
                className="size-14 rounded-full object-cover ring-2 ring-primary/30"
              />
            ) : (
              <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-lg font-semibold text-primary-foreground">
                {initials}
              </span>
            )}
            <div>
              <p className="font-medium">{user?.name ?? '—'}</p>
              <p className="text-sm text-muted-foreground">{user?.email ?? '—'}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Profile information is managed by your Google or GitHub account.
          </p>
        </CardContent>
      </Card>

      {/* Learning preferences */}
      <Card>
        <CardContent className="flex flex-col gap-5 p-6">
          <h2 className="font-semibold">Learning preferences</h2>
          <p className="text-sm text-muted-foreground">
            These defaults apply when you start a new lesson. You can always change them during the Start Learning flow.
          </p>
          <dl className="grid gap-3 sm:grid-cols-2">
            {preferences.map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* Session */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <h2 className="font-semibold">Session</h2>
          <p className="text-sm text-muted-foreground">
            You are signed in via Google OAuth. Sessions last 30 days.
          </p>
          <div>
            <SignOutButton />
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col gap-4 p-6">
          <h2 className="font-semibold text-destructive">Danger zone</h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action
            cannot be reversed — your profile, progress, materials, and files
            will be erased immediately.
          </p>
          <div>
            <DeleteAccountButton />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
