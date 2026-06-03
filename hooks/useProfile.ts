import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'

export interface UserProfile {
    fullName: string
    email: string
    initials: string
    planType: 'free' | 'premium'
    birthdate?: string
}

export function useProfile() {
    return useQuery<UserProfile>({
        queryKey: ['profile'],
        queryFn: async () => {
            const { data: { user }, error: authErr } = await supabase.auth.getUser()
            
            if (authErr || !user) {
                // Return a Guest profile instead of throwing to prevent React Query from failing and falling back to demo
                return {
                    fullName: '',
                    email: '',
                    initials: 'G',
                    planType: 'free',
                    birthdate: undefined,
                }
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('display_name, plan_type')
                .eq('id', user.id)
                .maybeSingle()

            const fullName =
                profile?.display_name ||
                (user.user_metadata?.full_name as string | undefined) ||
                user.email?.split('@')[0] ||
                ''

            return {
                fullName,
                email: user.email ?? '',
                initials: getInitials(fullName || 'User'),
                planType: (profile?.plan_type as 'free' | 'premium') ?? 'free',
                birthdate: user.user_metadata?.birthdate as string | undefined,
            }
        },
    })
}
