// ─── Built-in example networks ────────────────────────────────────────────────

export const EXAMPLES = {
  mm1: {
    label: 'Cola M/M/1',
    description: 'Una cola simple con llegadas Exp(0.5) y servicio Exp(1). Carga ρ = 0.5.',
    net: {
      places: [
        { id:'p1', x:100, y:200, name:'Fuente',         tokens:1 },
        { id:'p2', x:300, y:200, name:'Cola',           tokens:0 },
        { id:'p3', x:440, y:110, name:'Servidor libre', tokens:1 },
        { id:'p4', x:440, y:290, name:'En servicio',    tokens:0 },
        { id:'p5', x:620, y:200, name:'Salida',         tokens:0 },
      ],
      transitions: [
        { id:'t1', x:200, y:200, name:'Llegada',        type:'timed',     dist:{type:'exp', lambda:0.5}, weight:1, priority:0 },
        { id:'t2', x:360, y:200, name:'Ini. servicio',  type:'immediate', dist:null,                    weight:1, priority:0 },
        { id:'t3', x:530, y:200, name:'Fin servicio',   type:'timed',     dist:{type:'exp', lambda:1},  weight:1, priority:0 },
      ],
      arcs: [
        { id:'a1', from:'p1', fromType:'place',      to:'t1', toType:'transition', weight:1 },
        { id:'a2', from:'t1', fromType:'transition', to:'p1', toType:'place',      weight:1 },  // self-loop → keeps arriving
        { id:'a3', from:'t1', fromType:'transition', to:'p2', toType:'place',      weight:1 },
        { id:'a4', from:'p2', fromType:'place',      to:'t2', toType:'transition', weight:1 },
        { id:'a5', from:'p3', fromType:'place',      to:'t2', toType:'transition', weight:1 },
        { id:'a6', from:'t2', fromType:'transition', to:'p4', toType:'place',      weight:1 },
        { id:'a7', from:'p4', fromType:'place',      to:'t3', toType:'transition', weight:1 },
        { id:'a8', from:'t3', fromType:'transition', to:'p3', toType:'place',      weight:1 },
        { id:'a9', from:'t3', fromType:'transition', to:'p5', toType:'place',      weight:1 },
      ],
    },
  },

  mm2: {
    label: 'Cola M/M/2',
    description: 'Dos servidores paralelos. Llegadas Exp(0.7), servicio Exp(1) cada uno.',
    net: {
      places: [
        { id:'p1', x:100, y:220, name:'Fuente',           tokens:1 },
        { id:'p2', x:300, y:220, name:'Cola',             tokens:0 },
        { id:'p3', x:440, y:120, name:'Servidores libres',tokens:2 },
        { id:'p4', x:440, y:320, name:'En servicio',      tokens:0 },
        { id:'p5', x:640, y:220, name:'Salida',           tokens:0 },
      ],
      transitions: [
        { id:'t1', x:200, y:220, name:'Llegada',         type:'timed',     dist:{type:'exp', lambda:0.7}, weight:1, priority:0 },
        { id:'t2', x:360, y:220, name:'Ini. servicio',   type:'immediate', dist:null,                     weight:1, priority:0 },
        { id:'t3', x:540, y:220, name:'Fin servicio',    type:'timed',     dist:{type:'exp', lambda:1},   weight:1, priority:0 },
      ],
      arcs: [
        { id:'a1', from:'p1', fromType:'place',      to:'t1', toType:'transition', weight:1 },
        { id:'a2', from:'t1', fromType:'transition', to:'p1', toType:'place',      weight:1 },
        { id:'a3', from:'t1', fromType:'transition', to:'p2', toType:'place',      weight:1 },
        { id:'a4', from:'p2', fromType:'place',      to:'t2', toType:'transition', weight:1 },
        { id:'a5', from:'p3', fromType:'place',      to:'t2', toType:'transition', weight:1 },
        { id:'a6', from:'t2', fromType:'transition', to:'p4', toType:'place',      weight:1 },
        { id:'a7', from:'p4', fromType:'place',      to:'t3', toType:'transition', weight:1 },
        { id:'a8', from:'t3', fromType:'transition', to:'p3', toType:'place',      weight:1 },
        { id:'a9', from:'t3', fromType:'transition', to:'p5', toType:'place',      weight:1 },
      ],
    },
  },

  museum: {
    label: 'Museo – parte a)',
    description: '3 colas de venta (efectivo 2 vent., frecuente 1, crédito 2) → recepción → sala expo.',
    net: {
      places: [
        { id:'src',  x:60,  y:240, name:'Fuente visitantes', tokens:1 },
        { id:'qe',   x:220, y:130, name:'Cola Efectivo',      tokens:0 },
        { id:'we',   x:370, y:60,  name:'Vent. E (2)',        tokens:2 },
        { id:'qf',   x:220, y:240, name:'Cola Frecuente',     tokens:0 },
        { id:'wf',   x:370, y:240, name:'Vent. F (1)',        tokens:1 },
        { id:'qc',   x:220, y:350, name:'Cola Crédito',       tokens:0 },
        { id:'wc',   x:370, y:350, name:'Vent. C (2)',        tokens:2 },
        { id:'qrec', x:560, y:240, name:'Cola Recepción',     tokens:0 },
        { id:'wrec', x:690, y:140, name:'Recepcionista (1)',  tokens:1 },
        { id:'srec', x:690, y:340, name:'En Recepción',       tokens:0 },
        { id:'sala', x:860, y:240, name:'Sala Expo.',         tokens:0 },
      ],
      transitions: [
        { id:'larr', x:140, y:240, name:'Llegada',      type:'timed',     dist:{type:'exp', lambda:0.2},  weight:1, priority:0 },
        { id:'te',   x:490, y:130, name:'T_Efectivo',   type:'timed',     dist:{type:'exp', lambda:0.18}, weight:1, priority:0 },
        { id:'tf',   x:490, y:240, name:'T_Frecuente',  type:'timed',     dist:{type:'exp', lambda:0.18}, weight:1, priority:0 },
        { id:'tc',   x:490, y:350, name:'T_Crédito',    type:'timed',     dist:{type:'exp', lambda:0.18}, weight:1, priority:0 },
        { id:'irec', x:625, y:240, name:'Ini. Recep.',  type:'immediate', dist:null,                      weight:1, priority:0 },
        { id:'frec', x:770, y:240, name:'T_Recepción',  type:'timed',     dist:{type:'exp', lambda:0.5},  weight:1, priority:0 },
      ],
      arcs: [
        // arrivals
        { id:'la1', from:'src',  fromType:'place',      to:'larr', toType:'transition', weight:1 },
        { id:'la2', from:'larr', fromType:'transition', to:'src',  toType:'place',      weight:1 },
        { id:'la3', from:'larr', fromType:'transition', to:'qe',   toType:'place',      weight:1 },
        { id:'la4', from:'larr', fromType:'transition', to:'qf',   toType:'place',      weight:1 },
        { id:'la5', from:'larr', fromType:'transition', to:'qc',   toType:'place',      weight:1 },
        // efectivo
        { id:'ae1', from:'qe',   fromType:'place',      to:'te',   toType:'transition', weight:1 },
        { id:'ae2', from:'we',   fromType:'place',      to:'te',   toType:'transition', weight:1 },
        { id:'ae3', from:'te',   fromType:'transition', to:'we',   toType:'place',      weight:1 },
        { id:'ae4', from:'te',   fromType:'transition', to:'qrec', toType:'place',      weight:1 },
        // frecuente
        { id:'af1', from:'qf',   fromType:'place',      to:'tf',   toType:'transition', weight:1 },
        { id:'af2', from:'wf',   fromType:'place',      to:'tf',   toType:'transition', weight:1 },
        { id:'af3', from:'tf',   fromType:'transition', to:'wf',   toType:'place',      weight:1 },
        { id:'af4', from:'tf',   fromType:'transition', to:'qrec', toType:'place',      weight:1 },
        // crédito
        { id:'ac1', from:'qc',   fromType:'place',      to:'tc',   toType:'transition', weight:1 },
        { id:'ac2', from:'wc',   fromType:'place',      to:'tc',   toType:'transition', weight:1 },
        { id:'ac3', from:'tc',   fromType:'transition', to:'wc',   toType:'place',      weight:1 },
        { id:'ac4', from:'tc',   fromType:'transition', to:'qrec', toType:'place',      weight:1 },
        // recepción
        { id:'ir1', from:'qrec', fromType:'place',      to:'irec', toType:'transition', weight:1 },
        { id:'ir2', from:'wrec', fromType:'place',      to:'irec', toType:'transition', weight:1 },
        { id:'ir3', from:'irec', fromType:'transition', to:'srec', toType:'place',      weight:1 },
        { id:'fr1', from:'srec', fromType:'place',      to:'frec', toType:'transition', weight:1 },
        { id:'fr2', from:'frec', fromType:'transition', to:'wrec', toType:'place',      weight:1 },
        { id:'fr3', from:'frec', fromType:'transition', to:'sala', toType:'place',      weight:1 },
      ],
    },
  },

  ministerio: {
    label: 'Ministerio – parte a)',
    description: 'Expedientes: Exp(20min entre llegadas) → Est.1 N(7,1) 2 empl. → Est.2 N(10,0.5) 2 empl.',
    net: {
      places: [
        { id:'src', x:60,  y:220, name:'Fuente exp.',      tokens:1 },
        { id:'q1',  x:220, y:220, name:'Cola Est.1',       tokens:0 },
        { id:'e1',  x:360, y:110, name:'Empleados E1 (2)', tokens:2 },
        { id:'s1',  x:360, y:330, name:'En atención E1',   tokens:0 },
        { id:'q2',  x:540, y:220, name:'Cola Est.2',       tokens:0 },
        { id:'e2',  x:680, y:110, name:'Empleados E2 (2)', tokens:2 },
        { id:'s2',  x:680, y:330, name:'En atención E2',   tokens:0 },
        { id:'out', x:860, y:220, name:'Otra sala',        tokens:0 },
      ],
      transitions: [
        { id:'tll',  x:140, y:220, name:'Llegada',          type:'timed',     dist:{type:'exp',    lambda:1/20}, weight:1, priority:0 },
        { id:'ti1',  x:290, y:220, name:'Ini. Est.1',       type:'immediate', dist:null,                        weight:1, priority:0 },
        { id:'tf1',  x:450, y:220, name:'T_Est.1 N(7,1)',   type:'timed',     dist:{type:'normal', mean:7, std:1}, weight:1, priority:0 },
        { id:'ti2',  x:610, y:220, name:'Ini. Est.2',       type:'immediate', dist:null,                        weight:1, priority:0 },
        { id:'tf2',  x:770, y:220, name:'T_Est.2 N(10,.5)', type:'timed',     dist:{type:'normal', mean:10, std:0.5}, weight:1, priority:0 },
      ],
      arcs: [
        { id:'a1',  from:'src', fromType:'place',      to:'tll', toType:'transition', weight:1 },
        { id:'a2',  from:'tll', fromType:'transition', to:'src', toType:'place',      weight:1 },
        { id:'a3',  from:'tll', fromType:'transition', to:'q1',  toType:'place',      weight:1 },
        { id:'a4',  from:'q1',  fromType:'place',      to:'ti1', toType:'transition', weight:1 },
        { id:'a5',  from:'e1',  fromType:'place',      to:'ti1', toType:'transition', weight:1 },
        { id:'a6',  from:'ti1', fromType:'transition', to:'s1',  toType:'place',      weight:1 },
        { id:'a7',  from:'s1',  fromType:'place',      to:'tf1', toType:'transition', weight:1 },
        { id:'a8',  from:'tf1', fromType:'transition', to:'e1',  toType:'place',      weight:1 },
        { id:'a9',  from:'tf1', fromType:'transition', to:'q2',  toType:'place',      weight:1 },
        { id:'a10', from:'q2',  fromType:'place',      to:'ti2', toType:'transition', weight:1 },
        { id:'a11', from:'e2',  fromType:'place',      to:'ti2', toType:'transition', weight:1 },
        { id:'a12', from:'ti2', fromType:'transition', to:'s2',  toType:'place',      weight:1 },
        { id:'a13', from:'s2',  fromType:'place',      to:'tf2', toType:'transition', weight:1 },
        { id:'a14', from:'tf2', fromType:'transition', to:'e2',  toType:'place',      weight:1 },
        { id:'a15', from:'tf2', fromType:'transition', to:'out', toType:'place',      weight:1 },
      ],
    },
  },
};
