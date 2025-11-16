import {
  IconLayoutDashboard,
  IconSettings,
  IconGraph,
  IconUser,
  IconBriefcase2,
  IconHammer
} from "@tabler/icons-react";



import { uniqueId } from "lodash";

const Menuitems = [
  {
    navlabel: true,
    subheader: "HOME",
  },

  {
    id: uniqueId(),
    title: "Assegnazioni",
    icon: IconLayoutDashboard,
    href: "/private/admin/assegnazioni",
  },
  {
    navlabel: true,
    subheader: "GESTIONE",
  },
  {
    id: uniqueId(),
    title: "Gestione Commesse",
    icon: IconHammer,
    href: "/private/admin/commesse",
  },
  {
    id: uniqueId(),
    title: "Gestione Clienti",
    icon: IconBriefcase2,
    href: "/private/admin/clienti",
  },
  {
    navlabel: true,
    subheader: "AUTENTICAZIONE",
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
    title: "Genera Report",
    icon: IconGraph,
    href: "/private/admin/report",
  },
  {
    id: uniqueId(),
    title: "Impostazioni",
    icon: IconSettings,
    href: "/private/admin/impostazioni",
  },

];

export default Menuitems;


