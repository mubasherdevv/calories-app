import React, { createContext, useContext, useRef, useState, useCallback } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BlurView } from 'expo-blur'
import { Text } from '@/components/ui/Text'
import { SURFACE2, SUCCESS, ERROR, ACCENT, BORDER, TAB_HEIGHT } from '@/lib/theme'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
    id: number
    message: string
    type: ToastType
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast() {
    return useContext(ToastContext)
}

let _nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++_nextId
        setToasts((prev) => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 2200)
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastList toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
        </ToastContext.Provider>
    )
}

function toastColor(type: ToastType) {
    switch (type) {
        case 'success': return SUCCESS
        case 'error':   return ERROR
        default:        return ACCENT
    }
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const opacity = useRef(new Animated.Value(0)).current
    const translateY = useRef(new Animated.Value(-16)).current

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start()

        const t = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: -10, duration: 180, useNativeDriver: true }),
            ]).start(onDismiss)
        }, 1800)

        return () => clearTimeout(t)
    }, [])

    const color = toastColor(toast.type)

    return (
        <Animated.View style={[s.toastContainer, { opacity, transform: [{ translateY }] }]}>
            <BlurView intensity={80} tint="light" style={s.toastBlur}>
                <View style={[s.dot, { backgroundColor: color }]} />
                <Text style={s.message} numberOfLines={2}>{toast.message}</Text>
            </BlurView>
        </Animated.View>
    )
}

function ToastList({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
    const insets = useSafeAreaInsets()

    if (toasts.length === 0) return null

    return (
        <View
            style={[s.container, { top: insets.top + 16 }]}
            pointerEvents="none"
        >
            {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
            ))}
        </View>
    )
}

const s = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        gap: 8,
        zIndex: 999,
        alignItems: 'flex-end',
    },
    toastContainer: {
        maxWidth: 320,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 8,
    },
    toastBlur: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(34, 197, 94, 0.15)', // Green glass effect
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        flexShrink: 0,
    },
    message: {
        flexShrink: 1,
        fontSize: 13.5,
        color: '#1F2937',
        fontWeight: '600',
        lineHeight: 19,
    },
})
