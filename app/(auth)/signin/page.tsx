import dynamicImport from 'next/dynamic'

// Force dynamic rendering to prevent any static generation
export const dynamic = 'force-dynamic'

// Force dynamic rendering to prevent SSR issues with NextAuth
const SignInPageClient = dynamicImport(() => import('./signin-client'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md p-8">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-lg bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="h-6 w-6 rounded bg-gray-300" />
          </div>
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mx-auto"></div>
        </div>
      </div>
    </div>
  )
})

export default function SignInPage() {
  return <SignInPageClient />
}