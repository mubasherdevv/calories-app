import { ScrollView, StyleSheet, View, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { BG, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '@/lib/theme'

export default function SupportScreen() {
    const insets = useSafeAreaInsets()

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={[s.header, { paddingTop: insets.top + 8 }]}>
                <Pressable onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={20} color="#1F2937" />
                </Pressable>
                <Text style={s.title}>Contact Support</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView
                contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 32 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={s.card}>
                    <View style={s.iconBox}>
                        <Ionicons name="mail" size={24} color="#3B82F6" />
                    </View>
                    <Text style={s.heading}>Email Us</Text>
                    <Text style={s.paragraph}>
                        Need help with your account or have a feature request? Drop us a line and our team will get back to you within 24 hours.
                    </Text>
                    <Pressable style={s.primaryBtn}>
                        <Text style={s.primaryBtnText}>support@caloriesapp.com</Text>
                    </Pressable>
                </View>

                <View style={s.card}>
                    <View style={s.iconBox}>
                        <Ionicons name="chatbubbles" size={24} color="#10B981" />
                    </View>
                    <Text style={s.heading}>Live Chat</Text>
                    <Text style={s.paragraph}>
                        Chat with our AI nutrition coach or a human agent for immediate assistance.
                    </Text>
                    <Pressable style={[s.primaryBtn, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                        <Text style={[s.primaryBtnText, { color: '#10B981' }]}>Start a Chat</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    )
}

const s = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    title: { color: TEXT_PRIMARY, fontSize: 17, fontWeight: '700' },
    body: { padding: 24, gap: 16 },
    card: {
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    heading: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '800' },
    paragraph: { color: TEXT_SECONDARY, fontSize: 13.5, lineHeight: 21, textAlign: 'center' },
    primaryBtn: {
        marginTop: 8,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    primaryBtnText: {
        color: '#3B82F6',
        fontWeight: '800',
        fontSize: 14,
    },
})
