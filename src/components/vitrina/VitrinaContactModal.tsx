'use client';

import { useEffect, useMemo, useState } from 'react';
import { sendPortalContactEmail } from '@/lib/actions/portal-contact';
import {
  buildPortalContactRecipients,
  buildPortalContactSubject,
  validatePortalContactInput,
} from '@/lib/portal-contact';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function VitrinaContactModal({
  open,
  onOpenChange,
  proyectoId,
  proyectoNombre,
  encargadoCorreo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proyectoId: string;
  proyectoNombre: string;
  encargadoCorreo: string;
}) {
  const [remitente, setRemitente] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('');
  const [institucion, setInstitucion] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRemitente('');
    setMensaje('');
    setNombre('');
    setCargo('');
    setInstitucion('');
    setError('');
    setInfo('');
    setSending(false);
  }, [open]);

  const recipients = useMemo(
    () => buildPortalContactRecipients(encargadoCorreo, remitente),
    [encargadoCorreo, remitente],
  );
  const subject = buildPortalContactSubject(proyectoNombre);

  const canSend = validatePortalContactInput({
    remitente,
    mensaje,
    nombre,
    cargo,
    institucion,
  }).ok;

  async function handleSend() {
    setError('');
    setInfo('');
    const validated = validatePortalContactInput({
      remitente,
      mensaje,
      nombre,
      cargo,
      institucion,
    });
    if (!validated.ok) {
      setError(validated.error);
      return;
    }
    setSending(true);
    const result = await sendPortalContactEmail({
      proyectoId,
      remitente: validated.remitente,
      mensaje: validated.mensaje,
      nombre: validated.nombre,
      cargo: validated.cargo,
      institucion: validated.institucion,
    });
    setSending(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo enviar el mensaje');
      return;
    }
    setInfo('Mensaje enviado.');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[70]"
        className="z-[70] max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>Contactar</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {proyectoNombre.trim() ? (
            <p className="text-sm text-slate-600">
              Proyecto:{' '}
              <span className="font-medium text-slate-800">
                {proyectoNombre.trim()}
              </span>
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label>Destinatarios</Label>
            <div
              data-testid="portal-contact-recipients"
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            >
              {recipients.join(', ')}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="portal-contact-remitente">Remitente</Label>
            <Input
              id="portal-contact-remitente"
              type="email"
              autoComplete="email"
              value={remitente}
              onChange={(e) => setRemitente(e.target.value)}
              placeholder="Tu correo"
              required
              disabled={sending}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Asunto</Label>
            <div
              data-testid="portal-contact-subject"
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            >
              {subject}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="portal-contact-mensaje">Mensaje</Label>
            <Textarea
              id="portal-contact-mensaje"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={6}
              required
              disabled={sending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="portal-contact-nombre">Su nombre</Label>
            <Input
              id="portal-contact-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={sending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="portal-contact-cargo">Su cargo o título</Label>
            <Input
              id="portal-contact-cargo"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              required
              disabled={sending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="portal-contact-institucion">Su institución</Label>
            <Input
              id="portal-contact-institucion"
              value={institucion}
              onChange={(e) => setInstitucion(e.target.value)}
              required
              disabled={sending}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {info ? <p className="text-sm text-emerald-700">{info}</p> : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => void handleSend()}
            disabled={sending || !canSend}
          >
            {sending ? 'Enviando…' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
