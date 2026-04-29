import {
  IconLayoutDashboard,
  IconSettings,
  IconUser,
  IconBriefcase2,
  IconHammer,
  IconBell,
  IconCar,
  IconCalendarTime,
  IconTools,
} from "@tabler/icons-react";



import { uniqueId } from "lodash";

const Menuitems = [
  {
    navlabel: true,
    subheader: "HOME",
  },

  {
    id: uniqueId(),
    title: "Calendario",
    icon: IconCalendarTime,
    href: "/private/admin/calendario",
  },
  {
    id: uniqueId(),
    title: "Notifiche",
    icon: IconBell,
    href: "/private/admin/notifiche",
  },
  {
    navlabel: true,
    subheader: "GESTIONE",
  },
  {
    id: uniqueId(),
    title: "Gestione Cantieri",
    icon: IconBriefcase2,
    href: "/private/admin/cantieri",
  },
  {
    id: uniqueId(),
    title: "Gestione Inventario",
    icon: IconHammer,
    href: "/private/admin/inventario",
  },
  {
    id: uniqueId(),
    title: "Gestione Veicoli",
    icon: IconCar,
    href: "/private/admin/veicoli",
  },
  {
    id: uniqueId(),
    title: "Gestione Ferie",
    icon: IconLayoutDashboard,
    href: "/private/admin/ferie",
  },
  {
    id: uniqueId(),
    title: "Gestione Utenze",
    icon: IconUser,
    href: "/private/admin/utenze",
  },
  {
    navlabel: true,
    subheader: "ALTRO",
  },
  {
    id: uniqueId(),
    title: "Impostazioni",
    icon: IconSettings,
    href: "/private/admin/impostazioni",
  },
  {
    id: uniqueId(),
    title: "Utilità",
    icon: IconTools,
    href: "/private/admin/utilita",
  },

];

export default Menuitems;
