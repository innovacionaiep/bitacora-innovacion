'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import type { Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/components/tours/bitacora-tour.css';
import {
  buildProyectoTourSteps,
  PROYECTO_TOUR_BUTTONS,
  PROYECTO_TOUR_POPOVER_CLASS,
} from '@/lib/tours/proyecto-tour';
import { filterVisibleTourSteps } from '@/lib/tours/tour-dom';
import { createBitacoraTourDriver } from '@/lib/tours/driver-scaled-ui';

export type ProyectoTourHandle = {
  startTour: () => void;
};

export type ProyectoTourProps = {
  selectedTab: string;
};

export const ProyectoTour = forwardRef<ProyectoTourHandle, ProyectoTourProps>(
  function ProyectoTour({ selectedTab }, ref) {
    const driverRef = useRef<Driver | null>(null);
    const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
      null
    );
    const selectedTabRef = useRef(selectedTab);
    selectedTabRef.current = selectedTab;

    const destroyTour = useCallback(() => {
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
      driverRef.current?.destroy();
      driverRef.current = null;
    }, []);

    useEffect(() => destroyTour, [destroyTour]);

    // Si cambia de tab con el tour abierto, cerrarlo
    useEffect(() => {
      destroyTour();
    }, [selectedTab, destroyTour]);

    const startTour = useCallback(() => {
      destroyTour();

      startTimeoutRef.current = setTimeout(() => {
        startTimeoutRef.current = null;
        const steps = filterVisibleTourSteps(
          buildProyectoTourSteps(selectedTabRef.current)
        );
        if (steps.length === 0) return;

        const d = createBitacoraTourDriver({
          popoverClass: PROYECTO_TOUR_POPOVER_CLASS,
          smoothScroll: true,
          ...PROYECTO_TOUR_BUTTONS,
          steps,
          // Contenedores con overflow interno (Gantt, tablas): scrollIntoView
          // en el ancla, no solo en window (Driver.js no alcanza nested scroll).
          onHighlightStarted: (element) => {
            if (!(element instanceof HTMLElement)) return;
            element.scrollIntoView({
              block: 'center',
              inline: 'nearest',
              behavior: 'instant',
            });
          },
          onDestroyed: () => {
            driverRef.current = null;
          },
        });
        driverRef.current = d;
        d.drive();
      }, 280);
    }, [destroyTour]);

    useImperativeHandle(ref, () => ({ startTour }), [startTour]);

    return null;
  }
);
