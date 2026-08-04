import { useToast } from "@/hooks/common/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {/* whitespace-pre-line supaya pesan berbaris banyak (mis. daftar
                  pertanyaan yang belum benar pada form tracer) tampil sebagai
                  beberapa baris, bukan menyatu jadi satu paragraf. */}
              {description && (
                <ToastDescription className="whitespace-pre-line">{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
