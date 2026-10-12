export type VehicleKind = 'hatchback' | 'sedan' | 'suv' | 'rickshaw' | 'motorcycle' | 'pickup' | 'van' | 'police';
export interface VehicleDefinition { kind:VehicleKind; name:string; acceleration:number; topSpeed:number; brake:number; steering:number; mass:number; halfWidth:number; halfLength:number; halfHeight:number; colour:string; }
export const VEHICLE_TYPES:Record<VehicleKind,VehicleDefinition> = {
  hatchback:{kind:'hatchback',name:'Shanti 800',acceleration:11,topSpeed:26,brake:25,steering:1.65,mass:750,halfWidth:.88,halfLength:1.7,halfHeight:.55,colour:'#e87637'},
  sedan:{kind:'sedan',name:'Sundar Family Sedan',acceleration:10,topSpeed:30,brake:24,steering:1.45,mass:1200,halfWidth:.92,halfLength:2.05,halfHeight:.6,colour:'#5d95b2'},
  suv:{kind:'suv',name:'Monsoon SUV',acceleration:9,topSpeed:29,brake:23,steering:1.25,mass:1800,halfWidth:1.02,halfLength:2.05,halfHeight:.75,colour:'#b3aa83'},
  rickshaw:{kind:'rickshaw',name:'Chalo Auto',acceleration:8,topSpeed:18,brake:22,steering:2.2,mass:420,halfWidth:.72,halfLength:1.15,halfHeight:.58,colour:'#4c9561'},
  motorcycle:{kind:'motorcycle',name:'Bijli Motorcycle',acceleration:15,topSpeed:35,brake:30,steering:2.35,mass:180,halfWidth:.3,halfLength:1.02,halfHeight:.4,colour:'#984f40'},
  pickup:{kind:'pickup',name:'Mazdoor Pickup',acceleration:9,topSpeed:27,brake:22,steering:1.35,mass:1500,halfWidth:.98,halfLength:2.2,halfHeight:.65,colour:'#7b977f'},
  van:{kind:'van',name:'Parcel Pending Van',acceleration:7,topSpeed:24,brake:21,steering:1.15,mass:1900,halfWidth:1,halfLength:2.15,halfHeight:.75,colour:'#dccb9c'},
  police:{kind:'police',name:'Sundarpur Police',acceleration:13,topSpeed:33,brake:28,steering:1.55,mass:1350,halfWidth:.94,halfLength:2.05,halfHeight:.6,colour:'#ece3cb'},
};
