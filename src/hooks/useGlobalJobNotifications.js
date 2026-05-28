import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const INTERVAL_MS = 5000;

/**
 * Mounted once in AppLayout for the duration of the customer session.
 * Polls SMS, Email, and WhatsApp job lists every 5 s and fires a toast
 * whenever any job transitions to Completed or Failed — regardless of
 * which page the user is currently on.
 */
export function useGlobalJobNotifications() {
  const prevRef  = useRef({});
  const readyRef = useRef(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const [sr, er, wr] = await Promise.all([
          fetch('/api/sms-jobs'),
          fetch('/api/email-jobs'),
          fetch('/api/whatsapp-jobs'),
        ]);
        const [sms, email, wa] = await Promise.all([
          sr.json().catch(() => []),
          er.json().catch(() => []),
          wr.json().catch(() => []),
        ]);

        const all = [
          ...(Array.isArray(sms)   ? sms.map(j   => ({ ...j, _type: 'SMS'      })) : []),
          ...(Array.isArray(email) ? email.map(j  => ({ ...j, _type: 'Email'    })) : []),
          ...(Array.isArray(wa)    ? wa.map(j      => ({ ...j, _type: 'WhatsApp' })) : []),
        ];

        if (!readyRef.current) {
          // First snapshot — record current statuses without toasting.
          // Jobs already completed before the session started should not notify.
          readyRef.current = true;
          all.forEach(j => { prevRef.current[`${j._type}-${j.id}`] = j.status; });
          return;
        }

        all.forEach(job => {
          const key  = `${job._type}-${job.id}`;
          const prev = prevRef.current[key];

          if (prev !== undefined && prev !== 'Completed' && job.status === 'Completed') {
            toast.success(`${job._type} Job #${job.id} completed successfully!`);
          } else if (prev !== undefined && prev !== 'Completed' && prev !== 'Failed' && job.status === 'Failed') {
            toast.error(`${job._type} Job #${job.id} failed`);
          }

          prevRef.current[key] = job.status;
        });
      } catch {
        /* silent — network blips should not surface as errors */
      }
    };

    poll();
    const id = setInterval(poll, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}
