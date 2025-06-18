import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>
                  {typeof description === 'string' && description.includes('{"message"') 
                    ? (() => {
                        try {
                          const match = description.match(/\{"message":"([^"]+)"/);
                          return match ? match[1] : description.replace(/^\d+:\s*/, '');
                        } catch {
                          return description.replace(/^\d+:\s*/, '');
                        }
                      })()
                    : description
                  }
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
