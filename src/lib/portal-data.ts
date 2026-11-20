// Curated demo dataset — 45 records across three segments.
// Kept inline for a snappy demo. Swap to Cloud-backed queries in Phase 2.

export type Segment = "vil" | "shore" | "crm";

export type VilProperty = {
  segment: "vil";
  id: string;
  address: string;
  owner: string;
  beds: number;
  baths: number;
  sqft: number;
  lotSqft?: number;          // total lot size sqft (outdoor footprint)
  yearBuilt: number;
  marketValue: number;
  lastSalePrice: number;
  lastSaleDate: string;
  permitCount: number;
  permitDetails: string;
  lat: number;
  lng: number;
  hasLinkedIn: boolean;
  zillowUrl?: string;
};

export type ShoreProperty = {
  segment: "shore";
  id: string;
  address: string;
  city: string;
  zip: string;
  owner: string;
  sqft: number;
  lotSqft?: number;
  yearBuilt: number;
  buildingType: string;
  salePrice: number;
  saleDate: string;
  lastYearTax: number;
  zoning: string;
  ownerMail: string;
  lat: number;
  lng: number;
  zillowUrl?: string;
};

export type CrmContact = {
  segment: "crm";
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  linkedIn: string;
  hasEmail: boolean;
  hasPhone: boolean;
  hasLinkedIn: boolean;
  emailOptIn: boolean;
  lat: number;
  lng: number;
};

export type AnyRecord = VilProperty | ShoreProperty | CrmContact;

export const vilData: VilProperty[] = [
  { segment:"vil", id:"v1", address:"100 Wooded Ln, Villanova, PA 19085", owner:"UNION PRPCO LLC", beds:5, baths:4, sqft:2786, yearBuilt:1958, lotSqft:32000, marketValue:1115200, lastSalePrice:1115000, lastSaleDate:"2026-05-29", permitCount:3, permitDetails:"3 permits on file", lat:40.03411, lng:-75.34988, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/100-Wooded-Ln-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v2", address:"253 Ithan Creek Rd, Villanova, PA 19085", owner:"RUSCITO, RICHARD A & KAREN M", beds:5, baths:6, sqft:7466, yearBuilt:2004, lotSqft:60000, marketValue:1675500, lastSalePrice:1650000, lastSaleDate:"2026-02-17", permitCount:3, permitDetails:"3 permits on file", lat:40.0344, lng:-75.36131, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/253-Ithan-Creek-Rd-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v3", address:"717 N Spring Mill Rd, Villanova, PA 19085", owner:"SMITH, JAMES T & ELIZABETH", beds:6, baths:8, sqft:9275, yearBuilt:1925, lotSqft:89000, marketValue:2511300, lastSalePrice:2500000, lastSaleDate:"2026-03-31", permitCount:3, permitDetails:"3 permits on file", lat:40.046704, lng:-75.318358, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/717-N-Spring-Mill-Rd-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v4", address:"717 Spring Mill Rd, Villanova, PA 19085", owner:"DAVIDSON, MARGARET L", beds:7, baths:7, sqft:9275, yearBuilt:1925, lotSqft:86000, marketValue:2511000, lastSalePrice:2500000, lastSaleDate:"2026-04-01", permitCount:2, permitDetails:"2 permits on file", lat:40.046704, lng:-75.318358, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/717-Spring-Mill-Rd-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v5", address:"821 Oxford Crst, Villanova, PA 19085", owner:"THOMPSON, ROBERT W & SUSAN J", beds:4, baths:4, sqft:3944, yearBuilt:1992, lotSqft:48000, marketValue:1568300, lastSalePrice:1500000, lastSaleDate:"2026-02-27", permitCount:3, permitDetails:"3 permits on file", lat:40.051767, lng:-75.317973, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/821-Oxford-Crst-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v6", address:"1721 Sherwood Cir, Villanova, PA 19085", owner:"WILSON, CHRISTOPHER M", beds:5, baths:3, sqft:4414, yearBuilt:1961, lotSqft:53000, marketValue:1539000, lastSalePrice:1465000, lastSaleDate:"2026-03-18", permitCount:2, permitDetails:"2 permits on file", lat:40.04371, lng:-75.33273, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/1721-Sherwood-Cir-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v7", address:"538 Camp Woods Cir, Villanova, PA 19085", owner:"ANDERSON, PATRICIA A", beds:4, baths:3, sqft:3089, yearBuilt:1975, lotSqft:41000, marketValue:1232400, lastSalePrice:1100000, lastSaleDate:"2026-04-15", permitCount:3, permitDetails:"3 permits on file", lat:40.02191, lng:-75.37125, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/538-Camp-Woods-Cir-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v8", address:"770 & 768 Parkes Run Ln, Villanova, PA 19085", owner:"GARCIA, LUIS & MERCEDES", beds:7, baths:9, sqft:11033, yearBuilt:1925, lotSqft:94000, marketValue:5434300, lastSalePrice:5400000, lastSaleDate:"2026-04-15", permitCount:3, permitDetails:"3 permits on file", lat:40.031092, lng:-75.379353, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/770-Parkes-Run-Ln-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v9", address:"12 Chalous Ln, Villanova, PA 19085", owner:"MARTINEZ, JUAN C", beds:4, baths:6, sqft:5389, yearBuilt:2002, lotSqft:56000, marketValue:1459400, lastSalePrice:1450000, lastSaleDate:"2026-04-14", permitCount:2, permitDetails:"2 permits on file", lat:40.030042, lng:-75.349416, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/12-Chalous-Ln-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v10", address:"220 Radnor Chester Rd, Villanova, PA 19085", owner:"TAYLOR, KENNETH E & NANCY", beds:3, baths:2, sqft:4109, yearBuilt:1880, lotSqft:33000, marketValue:1150000, lastSalePrice:1150000, lastSaleDate:"2026-03-10", permitCount:3, permitDetails:"3 permits on file", lat:40.03491, lng:-75.36814, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/220-Radnor-Chester-Rd-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v11", address:"420 Inveraray Rd, Villanova, PA 19085", owner:"BROWN, MICHAEL J & ELIZABETH M", beds:4, baths:4, sqft:4100, yearBuilt:1987, lotSqft:38000, marketValue:1639400, lastSalePrice:1625000, lastSaleDate:"2026-04-17", permitCount:2, permitDetails:"2 permits on file", lat:40.024429, lng:-75.389186, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/420-Inveraray-Rd-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v12", address:"1445 Mount Pleasant Rd, Villanova, PA 19085", owner:"CHEN, DAVID & MELISSA", beds:5, baths:5, sqft:2756, yearBuilt:1905, lotSqft:30000, marketValue:2309900, lastSalePrice:2100000, lastSaleDate:"2026-04-23", permitCount:3, permitDetails:"3 permits on file", lat:40.05994, lng:-75.31334, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/1445-Mount-Pleasant-Rd-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v13", address:"601 Cedar Ln, Villanova, PA 19085", owner:"JOHNSON, THOMAS A", beds:4, baths:3, sqft:3582, yearBuilt:1956, lotSqft:29000, marketValue:1063000, lastSalePrice:1200000, lastSaleDate:"2026-03-26", permitCount:3, permitDetails:"3 permits on file", lat:40.04916, lng:-75.33415, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/601-Cedar-Ln-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v14", address:"538 Sproul Rd, Villanova, PA 19085", owner:"ROBINSON, WILLIAM & CAROL", beds:4, baths:3, sqft:2444, yearBuilt:1968, lotSqft:22000, marketValue:901400, lastSalePrice:862000, lastSaleDate:"2026-05-05", permitCount:2, permitDetails:"2 permits on file", lat:40.022388, lng:-75.36983, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/538-Sproul-Rd-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v15", address:"541 Atterbury Rd, Villanova, PA 19085", owner:"WHITE, SARAH E", beds:5, baths:7, sqft:6294, yearBuilt:2009, lotSqft:74000, marketValue:2559900, lastSalePrice:2550000, lastSaleDate:"2026-05-06", permitCount:3, permitDetails:"3 permits on file", lat:40.023445, lng:-75.371568, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/541-Atterbury-Rd-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v16", address:"230 N Ithan Ave, Villanova, PA 19085", owner:"MOORE, GEORGE R & DONNA L", beds:3, baths:4, sqft:2190, yearBuilt:1952, lotSqft:24000, marketValue:855700, lastSalePrice:635000, lastSaleDate:"2026-05-07", permitCount:2, permitDetails:"2 permits on file", lat:40.03687, lng:-75.33339, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/230-N-Ithan-Ave-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v17", address:"50 Greenwell Ln, Villanova, PA 19085", owner:"HARRIS, DANIEL J & PATRICIA", beds:5, baths:7, sqft:6258, yearBuilt:2004, lotSqft:58000, marketValue:4796000, lastSalePrice:4800000, lastSaleDate:"2026-05-26", permitCount:3, permitDetails:"3 permits on file", lat:40.027935, lng:-75.377159, hasLinkedIn:false, zillowUrl:"https://www.zillow.com/homes/50-Greenwell-Ln-Villanova-PA-19085_rb/" },
  // Unpermitted contrast homes — long-time owners, zero permits on file, prime renovation gap
  { segment:"vil", id:"v18", address:"855 Mt Moro Rd, Villanova, PA 19085", owner:"DELANEY, EDWARD J & MARGARET", beds:5, baths:4, sqft:5120, lotSqft:65340, yearBuilt:1962, marketValue:2180000, lastSalePrice:1985000, lastSaleDate:"2019-08-12", permitCount:0, permitDetails:"No permits on file (last 25 yrs)", lat:40.045210, lng:-75.346118, hasLinkedIn:true, zillowUrl:"https://www.zillow.com/homes/855-Mt-Moro-Rd-Villanova-PA-19085_rb/" },
  { segment:"vil", id:"v19", address:"1010 Conestoga Rd, Villanova, PA 19085", owner:"O'CONNELL, PATRICK & SUSAN", beds:6, baths:5, sqft:6890, lotSqft:88210, yearBuilt:1951, marketValue:3120000, lastSalePrice:2750000, lastSaleDate:"2020-05-19", permitCount:0, permitDetails:"No permits on file (last 25 yrs)", lat:40.037842, lng:-75.358905, hasLinkedIn:true, zillowUrl:"https://www.zillow.com/homes/1010-Conestoga-Rd-Villanova-PA-19085_rb/" },
];

export const shoreData: ShoreProperty[] = [
  { segment:"shore", id:"s1", address:"113 S Nassau Ave", city:"Margate City", zip:"08402", owner:"Romanelli, Joseph S & Anne B", sqft:2269, yearBuilt:1962, lotSqft:5900, buildingType:"Single Family", salePrice:2775000, saleDate:"2023-09-01", lastYearTax:6677, zoning:"RES", ownerMail:"1820 Rittenhouse Sq, Philadelphia, PA 19103", lat:39.324597, lng:-74.503901, zillowUrl:"https://www.zillow.com/homes/113-S-Nassau-Ave-Margate-City-NJ-08402_rb/" },
  { segment:"shore", id:"s2", address:"108 S Richards Ave", city:"Ventnor City", zip:"08406", owner:"Waks, Robert & Beth", sqft:2100, yearBuilt:1995, lotSqft:6100, buildingType:"Single Family", salePrice:1755000, saleDate:"2007-11-01", lastYearTax:14200, zoning:"RES", ownerMail:"422 Wynnewood Rd, Wynnewood, PA 19096", lat:39.334336, lng:-74.484484, zillowUrl:"https://www.zillow.com/homes/108-S-Richards-Ave-Ventnor-City-NJ-08406_rb/" },
  { segment:"shore", id:"s3", address:"2532-34 West Ave (Wesley Ave on Zillow)", city:"Ocean City", zip:"08226", owner:"Schobert, Gilbert H", sqft:1850, yearBuilt:1962, lotSqft:3300, buildingType:"Residential", salePrice:112000, saleDate:"2019-06-15", lastYearTax:6420, zoning:"RES", ownerMail:"217 Walnut St, Philadelphia, PA 19106", lat:39.2748, lng:-74.5782, zillowUrl:"https://www.zillow.com/homes/2532-Wesley-Ave-Ocean-City-NJ-08226_rb/" },
  { segment:"shore", id:"s4", address:"101 S Coolidge Ave", city:"Margate City", zip:"08402", owner:"Da Silva, Fernando T & Vera", sqft:1420, yearBuilt:1978, buildingType:"Condo Building", salePrice:875000, saleDate:"2021-08-12", lastYearTax:9850, zoning:"RES", ownerMail:"915 N 22nd St, Philadelphia, PA 19130", lat:39.3290, lng:-74.5042, zillowUrl:"https://www.zillow.com/homes/101-S-Coolidge-Ave-Margate-City-NJ-08402_rb/" },
  { segment:"shore", id:"s5", address:"9501 Atlantic Ave", city:"Margate City", zip:"08402", owner:"Kasprzak, Mark A & Michele M", sqft:1630, yearBuilt:1950, lotSqft:4500, buildingType:"Single Family", salePrice:118700, saleDate:"2016-07-22", lastYearTax:2136, zoning:"RES", ownerMail:"36 Hilltop Rd, Bryn Mawr, PA 19010", lat:39.319836, lng:-74.514349, zillowUrl:"https://www.zillow.com/homes/9501-Atlantic-Ave-Margate-City-NJ-08402_rb/" },
  { segment:"shore", id:"s6", address:"400 N Clermont Ave", city:"Margate City", zip:"08402", owner:"Spina Jr, James et al", sqft:2480, yearBuilt:1968, lotSqft:5600, buildingType:"Single Family", salePrice:1160000, saleDate:"2025-10-01", lastYearTax:14200, zoning:"RES", ownerMail:"1840 Spruce St, Philadelphia, PA 19103", lat:39.3368, lng:-74.50099, zillowUrl:"https://www.zillow.com/homes/400-N-Clermont-Ave-Margate-City-NJ-08402_rb/" },
  { segment:"shore", id:"s7", address:"1310a Pennsylvania Ave", city:"Cape May", zip:"08204", owner:"Lanahan, Elizabeth A", sqft:1280, yearBuilt:1942, lotSqft:2500, buildingType:"Residential", salePrice:97600, saleDate:"2020-04-22", lastYearTax:1756, zoning:"RES", ownerMail:"612 Pine St, Philadelphia, PA 19106", lat:38.941762, lng:-74.907091, zillowUrl:"https://www.zillow.com/homes/1310-Pennsylvania-Ave-Cape-May-NJ-08204_rb/" },
  { segment:"shore", id:"s8", address:"212 Shadeland Avenue", city:"Villas", zip:"08251", owner:"Foley, Gerard P & Carolyn D", sqft:1640, yearBuilt:1965, lotSqft:5100, buildingType:"Single Family", salePrice:338400, saleDate:"2018-09-10", lastYearTax:6091, zoning:"RES", ownerMail:"245 Lancaster Ave, Devon, PA 19333", lat:39.00737, lng:-74.94837, zillowUrl:"https://www.zillow.com/homes/212-Shadeland-Ave-Villas-NJ-08251_rb/" },
  { segment:"shore", id:"s9", address:"168 38th Street", city:"Avalon", zip:"08202", owner:"Duzinski, Stephen & Roseanne Etal", sqft:1980, yearBuilt:1972, lotSqft:4400, buildingType:"Single Family", salePrice:1461200, saleDate:"2019-11-05", lastYearTax:8301, zoning:"RES", ownerMail:"310 Heron Dr, Newtown Square, PA 19073", lat:39.0972, lng:-74.7158, zillowUrl:"https://www.zillow.com/homes/168-38th-St-Avalon-NJ-08202_rb/" },
  { segment:"shore", id:"s10", address:"9410 Second Ave Unit 207", city:"Stone Harbor", zip:"08247", owner:"Miller, Stephen W", sqft:1142, yearBuilt:1985, buildingType:"Condo", salePrice:635900, saleDate:"2022-06-18", lastYearTax:11446, zoning:"RES", ownerMail:"55 Edgewood Rd, Bala Cynwyd, PA 19004", lat:39.054129, lng:-74.757583, zillowUrl:"https://www.zillow.com/homes/9410-Second-Ave-Stone-Harbor-NJ-08247_rb/" },
  { segment:"shore", id:"s11", address:"351 96th St (Unit 410)", city:"Stone Harbor", zip:"08247", owner:"Pozzuolo, Joseph & Sharyn", sqft:720, yearBuilt:1974, buildingType:"Condo", salePrice:710000, saleDate:"2020-07-01", lastYearTax:11817, zoning:"RES", ownerMail:"1900 Market St, Philadelphia, PA 19103", lat:39.055076, lng:-74.762355, zillowUrl:"https://www.zillow.com/homes/351-96th-St-Stone-Harbor-NJ-08247_rb/" },
  { segment:"shore", id:"s12", address:"122 Jordan Rd", city:"Somers Point", zip:"08244", owner:"Rowson, James & Joan", sqft:1160, yearBuilt:1959, lotSqft:2500, buildingType:"Single Family", salePrice:171600, saleDate:"2017-05-22", lastYearTax:3088, zoning:"RES", ownerMail:"880 Old Lancaster Rd, Berwyn, PA 19312", lat:39.31999, lng:-74.60779, zillowUrl:"https://www.zillow.com/homes/122-Jordan-Rd-Somers-Point-NJ-08244_rb/" },
  { segment:"shore", id:"s13", address:"202 Ocean Ave", city:"Cape May Point", zip:"08212", owner:"Van Vleck, Elizabeth S", sqft:439, yearBuilt:1900, buildingType:"Condo", salePrice:284900, saleDate:"2016-08-14", lastYearTax:5128, zoning:"RES", ownerMail:"144 Llanfair Rd, Ardmore, PA 19003", lat:38.935267, lng:-74.966739, zillowUrl:"https://www.zillow.com/homes/202-Ocean-Ave-Cape-May-Point-NJ-08212_rb/" },
  { segment:"shore", id:"s14", address:"406 Oxford Ave", city:"Cape May Point", zip:"08212", owner:"Goren, Denise", sqft:1346, yearBuilt:1940, lotSqft:3500, buildingType:"Single Family", salePrice:561100, saleDate:"2018-03-30", lastYearTax:10099, zoning:"RES", ownerMail:"2400 South St, Philadelphia, PA 19146", lat:38.93705, lng:-74.965305, zillowUrl:"https://www.zillow.com/homes/406-Oxford-Ave-Cape-May-Point-NJ-08212_rb/" },
  { segment:"shore", id:"s15", address:"217 Beach Ave (Unit C-204)", city:"Cape May City", zip:"08204", owner:"Mccloskey, Joel & Godshall, Jessica", sqft:786, yearBuilt:1986, buildingType:"Condo", salePrice:215000, saleDate:"2020-09-15", lastYearTax:6602, zoning:"RES", ownerMail:"118 Cherry Ln, Wayne, PA 19087", lat:38.930722, lng:-74.928253, zillowUrl:"https://www.zillow.com/homes/217-Beach-Ave-Cape-May-NJ-08204_rb/" },
];

export const crmData: CrmContact[] = [
  { segment:"crm", id:"c1",  name:"Tony Hipple",             email:"tonyhipple@comcast.net",      phone:"(215) 239-7520", address:"239 Ridge Avenue",            city:"Newtown",        state:"PA", zip:"18940", linkedIn:"https://www.linkedin.com/in/treinert",                          hasEmail:true, hasPhone:true, hasLinkedIn:true, emailOptIn:true,  lat:40.2497, lng:-74.8887 },
  { segment:"crm", id:"c2",  name:"Nick Kohart",             email:"nick.kohart@imacsystems.com", phone:"(215) 378-2699", address:"116 Jane Chapman Dr",         city:"Newtown",        state:"PA", zip:"18940", linkedIn:"https://www.linkedin.com/in/nicholas-kohart-a7337927",          hasEmail:true, hasPhone:true, hasLinkedIn:true, emailOptIn:true,  lat:40.2317, lng:-74.9267 },
  { segment:"crm", id:"c3",  name:"Denise Pryce",            email:"fruitveg@comcast.net",        phone:"(267) 992-7107", address:"2749 Miriam Avenue",          city:"Roslyn",         state:"PA", zip:"19001", linkedIn:"https://www.linkedin.com/in/denise-kypke",                       hasEmail:true, hasPhone:true, hasLinkedIn:true, emailOptIn:true,  lat:40.1144, lng:-75.1253 },
  { segment:"crm", id:"c4",  name:"June Henry",              email:"herderj@verizon.net",         phone:"(267) 414-7638", address:"816 E Sharpnack St",          city:"Philadelphia",   state:"PA", zip:"19103", linkedIn:"https://www.linkedin.com/in/june-wang-479b9479",                hasEmail:true, hasPhone:true, hasLinkedIn:true, emailOptIn:false, lat:40.0631, lng:-75.1890 },
  { segment:"crm", id:"c5",  name:"Dan Levin",               email:"dlevin@janney.com",           phone:"215.619.3923",   address:"1767 Sentry Pkwy W Ste 110",  city:"Blue Bell",      state:"PA", zip:"19422", linkedIn:"https://www.linkedin.com/in/dan-wolfgang-janney",                hasEmail:true, hasPhone:true, hasLinkedIn:true, emailOptIn:true,  lat:40.1486, lng:-75.2723 },
  { segment:"crm", id:"c6",  name:"Todd Hewish",             email:"todd@nolanpainting.com",      phone:"(215) 906-2006", address:"946 Avenue D",                city:"Langhorne",      state:"PA", zip:"19047", linkedIn:"https://www.linkedin.com/in/todd-carlin",                        hasEmail:true, hasPhone:true, hasLinkedIn:true, emailOptIn:true,  lat:40.1768, lng:-74.9276 },
  { segment:"crm", id:"c7",  name:"Anna McMenamin",          email:"anna@stylinggypsy.com",       phone:"(703) 732-4800", address:"1408 Gypsy Hill Road",        city:"Gwynedd Valley", state:"PA", zip:"19437", linkedIn:"https://www.linkedin.com/in/anna-mcmenamin-59066223",            hasEmail:true, hasPhone:true, hasLinkedIn:true, emailOptIn:true,  lat:40.1853, lng:-75.2561 },
  { segment:"crm", id:"c8",  name:"Maryana Garbuz",          email:"maryana@cecresearch.com",     phone:"(908) 967-6790", address:"1065 Woodland Avenue",        city:"Plainfield",     state:"NJ", zip:"07060", linkedIn:"https://www.linkedin.com/in/maryanakaplan",                      hasEmail:true, hasPhone:true, hasLinkedIn:true, emailOptIn:true,  lat:40.6397, lng:-74.4024 },
  { segment:"crm", id:"c9",  name:"Mary & Phil Arndtsen-Dahlin", email:"marndtsen@comcast.net",   phone:"(610) 745-3070", address:"118 Lakeview Dr",             city:"New Hope",       state:"PA", zip:"18938", linkedIn:"https://www.linkedin.com/in/mary-arndtsen-0975697",              hasEmail:true, hasPhone:true, hasLinkedIn:true, emailOptIn:false, lat:40.3668, lng:-74.9493 },
  { segment:"crm", id:"c10", name:"Kathleen Hunsicker",      email:"kathhunsicker@comcast.net",   phone:"(215) 901-3500", address:"48 Cadwalader Ct",            city:"Lower Gwynedd",  state:"PA", zip:"19002", linkedIn:"https://www.linkedin.com/in/kathleen-holden-3b970356",           hasEmail:true, hasPhone:true, hasLinkedIn:true, emailOptIn:true,  lat:40.1729, lng:-75.2360 },
  { segment:"crm", id:"c11", name:"Dan Holder",              email:"holderdan@comcast.net",       phone:"(610) 389-6041", address:"1447 Whitwood Drive",         city:"Blue Bell",      state:"PA", zip:"19422", linkedIn:"https://www.linkedin.com/in/danvfederico",                       hasEmail:true, hasPhone:true, hasLinkedIn:true, emailOptIn:true,  lat:40.1476, lng:-75.2743 },
  { segment:"crm", id:"c12", name:"Jennifer Kibblehouse",    email:"jennkibb@verizon.net",        phone:"(267) 614-1271", address:"809 Foxfield Road",           city:"Ambler",         state:"PA", zip:"19002", linkedIn:"https://www.linkedin.com/in/jennifer-sherlock-mba-41110120",     hasEmail:true, hasPhone:true, hasLinkedIn:true, emailOptIn:true,  lat:40.1583, lng:-75.2299 },
  { segment:"crm", id:"c13", name:"Judy DeLello",            email:"judy@isisupport.com",         phone:"(610) 283-4335", address:"2533 Stony Creek Road",       city:"Lansdale",       state:"PA", zip:"19446", linkedIn:"https://www.linkedin.com/in/judy-delello-6aa639a",               hasEmail:true, hasPhone:true, hasLinkedIn:true, emailOptIn:true,  lat:40.2465, lng:-75.2785 },
  { segment:"crm", id:"c14", name:"Maryann Schultz",         email:"missy.schultz@verizon.net",   phone:"(267) 474-5185", address:"57 Meade Rd",                 city:"Ambler",         state:"PA", zip:"19002", linkedIn:"https://www.linkedin.com/in/maryann-reyes-95148b122",            hasEmail:true, hasPhone:true, hasLinkedIn:true, emailOptIn:false, lat:40.1523, lng:-75.2239 },
  { segment:"crm", id:"c15", name:"Lee Tanner",              email:"leetanner@comcast.net",       phone:"(215) 620-4311", address:"604 Creek Lane",              city:"Flourtown",      state:"PA", zip:"19031", linkedIn:"https://www.linkedin.com/in/lee-russakoff-3157b215",             hasEmail:true, hasPhone:true, hasLinkedIn:true, emailOptIn:true,  lat:40.1102, lng:-75.2160 },
];

// ─── Opportunity scoring (1-10) ─────────────────────────────
// Vil weights: permit gap 30%, $/sqft 25%, age 15%, cash-availability 20%, channel data 10%
const NOW_YEAR = 2026;

// Cash-availability proxy from purchase date.
// Buyers who closed during the historic-low-rate window (~Jul 2018 → Dec 2021)
// are locked into ~3% mortgages → much LESS disposable cash for a major remodel
// (golden-handcuffs effect). Buyers who closed before mid-2018 OR after early 2022
// have either ample equity or are already at market rates → MORE renovation appetite.
export function cashAvailabilityFactor(saleDateISO: string | undefined): number {
  if (!saleDateISO) return 0.5;
  const t = Date.parse(saleDateISO);
  if (Number.isNaN(t)) return 0.5;
  const d = new Date(t);
  const lowRateStart = Date.parse("2018-07-01");
  const lowRateEnd = Date.parse("2021-12-31");
  if (t >= lowRateStart && t <= lowRateEnd) return 0.25; // locked-in low rate, less cash to renovate
  // Long-time owners (>15 yrs) — significant equity, high renovation appetite
  const yearsHeld = (Date.now() - t) / (365.25 * 24 * 3600 * 1000);
  if (yearsHeld > 15) return 1.0;
  if (yearsHeld > 8)  return 0.85;
  // Recent buyers at current market rates — already priced in, motivated to invest
  if (t > Date.parse("2022-06-01")) return 0.9;
  return 0.7;
}

export function pricePerSqft(r: AnyRecord): number | null {
  if (r.segment === "vil") {
    if (!r.sqft) return null;
    return Math.round((r.lastSalePrice || r.marketValue) / r.sqft);
  }
  if (r.segment === "shore") {
    if (!r.sqft || !r.salePrice) return null;
    return Math.round(r.salePrice / r.sqft);
  }
  return null;
}

// Extract a local "neighborhood key" — zip if present, else city — so $/sqft
// gets compared apples-to-apples within a cluster (Villanova ≠ Margate ≠ Ocean City).
export function neighborhoodKey(r: AnyRecord): string {
  if (r.segment === "vil") {
    const m = r.address.match(/\b(\d{5})\b/);
    return m ? `vil:${m[1]}` : "vil:19085";
  }
  if (r.segment === "shore") return `shore:${r.zip || r.city}`;
  return `crm:${(r as { zip?: string }).zip ?? ""}`;
}

// Median $/sqft by neighborhood — Enrique's correction: heat & opp must compare
// each home to its LOCAL average, not the segment-wide one.
const __NBHD_PPSF = (() => {
  const buckets = new Map<string, number[]>();
  for (const r of [...vilData, ...shoreData] as AnyRecord[]) {
    const v = pricePerSqft(r);
    if (!v || v < 50) continue;
    const k = neighborhoodKey(r);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(v);
  }
  const out = new Map<string, number>();
  for (const [k, arr] of buckets) {
    arr.sort((a, b) => a - b);
    out.set(k, arr[Math.floor(arr.length / 2)]!);
  }
  return out;
})();

export function neighborhoodPpsf(r: AnyRecord): number {
  const k = neighborhoodKey(r);
  return __NBHD_PPSF.get(k) ?? 400;
}

// Kept for back-compat — segment-wide median across Vil only.
const __ALL_PPSF = (() => {
  const pool: number[] = [];
  for (const r of [...vilData] as AnyRecord[]) {
    const v = pricePerSqft(r);
    if (v && v > 50) pool.push(v);
  }
  return pool.sort((a, b) => a - b);
})();
export const MEDIAN_PPSF = __ALL_PPSF.length
  ? __ALL_PPSF[Math.floor(__ALL_PPSF.length / 2)]!
  : 400;

// Median lot size across Villanova set — used to score outdoor renovation upside
// (bigger lot = more pool / hardscape / landscape potential).
const __ALL_LOTS = (() => {
  const pool: number[] = [];
  for (const r of vilData) if (r.lotSqft && r.lotSqft > 1000) pool.push(r.lotSqft);
  return pool.sort((a, b) => a - b);
})();
export const MEDIAN_LOT_SQFT = __ALL_LOTS.length
  ? __ALL_LOTS[Math.floor(__ALL_LOTS.length / 2)]!
  : 40000;

// 0..1 — lot size vs neighborhood median (0.5x → 0, 2x+ → 1).
export function lotFactor(lotSqft: number | undefined): number {
  if (!lotSqft) return 0.5;
  const ratio = lotSqft / MEDIAN_LOT_SQFT;
  return Math.max(0, Math.min(1, (ratio - 0.5) / 1.5));
}

// Years since the most recent permit was filed — proxy for "renovation debt"
// accumulating on the home. Imported lazily to avoid circular dep.
function yearsSinceLastPermit(propId: string): number {
  // Avoid circular import — read permit dates inline.
  // Lazy reference: portal-permits sets REAL_PERMITS_BY_PROP on this module.
  const reg = (globalThis as { __HARTH_PERMITS__?: Record<string, { date: string }[]> }).__HARTH_PERMITS__;
  const list = reg?.[propId];
  if (!list || list.length === 0) return 30; // "never permitted" → max debt
  const latest = list.map((p) => Date.parse(p.date)).filter((n) => !Number.isNaN(n)).sort((a, b) => b - a)[0];
  if (!latest) return 30;
  return Math.max(0, (Date.now() - latest) / (365.25 * 24 * 3600 * 1000));
}

// 0..1 — renovation debt accumulator. 0 yrs = 0, 5 yrs = 0.4, 10 yrs = 0.75, 25+ = 1.
export function renoDebtFactor(propId: string): number {
  const yrs = yearsSinceLastPermit(propId);
  return Math.min(1, yrs / 18);
}

export function opportunityScore(r: AnyRecord): number {
  if (r.segment === "vil") {
    // Permit gap — proxy for how many trade categories have never been permitted.
    const permitGap = Math.max(0, 1 - r.permitCount / 4);
    // $/sqft vs LOCAL neighborhood median — under-priced per foot = upside room.
    const nbhd = neighborhoodPpsf(r);
    const ppsf = pricePerSqft(r) ?? nbhd;
    const ppsfFactor = Math.max(0, Math.min(1, (nbhd * 1.5 - ppsf) / nbhd));
    const lot = lotFactor(r.lotSqft);
    const cash = cashAvailabilityFactor(r.lastSaleDate);
    const ageNorm = Math.min(1, (NOW_YEAR - r.yearBuilt) / 70);
    const channel = r.hasLinkedIn ? 1 : 0.5;
    const renoDebt = renoDebtFactor(r.id);
    const raw =
      permitGap  * 0.20 +
      ppsfFactor * 0.20 +
      renoDebt   * 0.15 +
      lot        * 0.10 +
      cash       * 0.20 +
      ageNorm    * 0.10 +
      channel    * 0.05;
    return Math.round(raw * 10 * 10) / 10;
  }
  if (r.segment === "shore") {
    // Enrique's logic: bought BELOW neighborhood average = renovation budget
    // still available. Above-average sale = priced-out, less upside.
    const nbhd = neighborhoodPpsf(r);
    const ppsf = pricePerSqft(r) ?? nbhd;
    const ppsfFactor = Math.max(0, Math.min(1, (nbhd * 1.5 - ppsf) / nbhd));
    const ageNorm = Math.min(1, (NOW_YEAR - r.yearBuilt) / 70);
    const lot = lotFactor(r.lotSqft);
    const pa = r.ownerMail?.includes(", PA") ? 1 : 0.4;
    const cash = cashAvailabilityFactor(r.saleDate);
    const raw =
      ppsfFactor * 0.35 +
      cash       * 0.20 +
      ageNorm    * 0.20 +
      lot        * 0.15 +
      pa         * 0.10;
    return Math.round(raw * 10 * 10) / 10;
  }
  // crm
  const channel =
    (r.hasEmail ? 0.4 : 0) + (r.hasPhone ? 0.2 : 0) + (r.hasLinkedIn ? 0.3 : 0) + (r.emailOptIn ? 0.1 : 0);
  return Math.round(channel * 10 * 10) / 10;
}

// Heat-map weight — Enrique's correction: a HOT pin is a property that
// LOOKS like opportunity (below-neighborhood $/sqft AND under-permitted).
// Premium-priced + well-permitted = cold (already touched).
export function heatWeight(r: AnyRecord): number {
  if (r.segment === "vil") {
    const nbhd = neighborhoodPpsf(r);
    const ppsf = pricePerSqft(r) ?? nbhd;
    // 0 when ppsf is 1.5× neighborhood, 1 when ppsf is 0.5× neighborhood.
    const ppsfFactor = Math.max(0, Math.min(1, (nbhd * 1.5 - ppsf) / nbhd));
    const permitFactor = Math.max(0, 1 - r.permitCount / 4);
    // 60% pricing, 40% permits — matches the opp-score logic.
    return Math.max(0.05, Math.min(1, 0.6 * ppsfFactor + 0.4 * permitFactor));
  }
  if (r.segment === "shore") {
    const nbhd = neighborhoodPpsf(r);
    const ppsf = pricePerSqft(r) ?? nbhd;
    const ppsfFactor = Math.max(0, Math.min(1, (nbhd * 1.5 - ppsf) / nbhd));
    // Shore: most homes are minimally permitted in our dataset, so weight ppsf more.
    return Math.max(0.05, Math.min(1, 0.75 * ppsfFactor + 0.25 * 0.9));
  }
  // crm — channel completeness as warmth.
  const ch = (r.hasEmail ? 0.4 : 0) + (r.hasPhone ? 0.2 : 0) + (r.hasLinkedIn ? 0.3 : 0) + (r.emailOptIn ? 0.1 : 0);
  return Math.max(0.05, ch);
}

// Plain-language driver breakdown used by the score tooltip — no formulas exposed.
export function scoreDrivers(r: AnyRecord): { label: string; tone: "pos" | "neg" | "neu" }[] {
  const out: { label: string; tone: "pos" | "neg" | "neu" }[] = [];
  if (r.segment === "vil") {
    if (r.permitCount === 0) out.push({ label: "Zero permits on file — major renovation gap", tone: "pos" });
    else if (r.permitCount <= 1) out.push({ label: `Only ${r.permitCount} permit on file — under-renovated`, tone: "pos" });
    else out.push({ label: `${r.permitCount} recent permits — owner actively maintaining`, tone: "neg" });

    const nbhd = neighborhoodPpsf(r);
    const ppsf = pricePerSqft(r);
    if (ppsf && ppsf < nbhd * 0.85) out.push({ label: `$/sqft below local average — upside room`, tone: "pos" });
    else if (ppsf && ppsf > nbhd * 1.15) out.push({ label: `$/sqft above local average — already premium-priced`, tone: "neg" });

    const age = NOW_YEAR - r.yearBuilt;
    if (age >= 50) out.push({ label: `${age}-year-old home — likely aging systems`, tone: "pos" });
    else if (age <= 15) out.push({ label: `Newer build (${age} yrs) — fewer system needs`, tone: "neg" });

    const cash = cashAvailabilityFactor(r.lastSaleDate);
    if (cash >= 0.9) out.push({ label: "Long-time owner — built equity, renovation appetite", tone: "pos" });
    else if (cash <= 0.3) out.push({ label: "Bought 2018–2021 — likely locked into low mortgage, less renovation cash", tone: "neg" });

    if (r.lotSqft && r.lotSqft >= MEDIAN_LOT_SQFT * 1.4)
      out.push({ label: `Lot ${Math.round(r.lotSqft / 1000)}k sqft — above neighborhood median, outdoor scope`, tone: "pos" });
    else if (r.lotSqft && r.lotSqft <= MEDIAN_LOT_SQFT * 0.6)
      out.push({ label: `Small lot (${Math.round(r.lotSqft / 1000)}k sqft) — limited outdoor scope`, tone: "neg" });

    // Renovation debt — years since most recent permit (or "never" if none).
    const yrs = yearsSinceLastPermit(r.id);
    if (yrs >= 25) out.push({ label: "No permits filed in 25+ years — major renovation debt accumulated", tone: "pos" });
    else if (yrs >= 10) out.push({ label: `Last permit ${Math.round(yrs)} yrs ago — renovation debt accumulating`, tone: "pos" });
    else if (yrs >= 5) out.push({ label: `Last permit ${Math.round(yrs)} yrs ago — due for the next round`, tone: "neu" });
    else out.push({ label: `Last permit ${Math.round(yrs)} yrs ago — recently renovated`, tone: "neg" });

    if (r.hasLinkedIn) out.push({ label: "Reachable via LinkedIn", tone: "pos" });
  } else if (r.segment === "shore") {
    out.push({ label: `Beach property valued at $${(r.salePrice / 1_000_000).toFixed(1)}M`, tone: r.salePrice > 1_500_000 ? "pos" : "neu" });
    if (r.ownerMail?.includes(", PA")) out.push({ label: "Out-of-state PA owner — second-home renovation typical", tone: "pos" });
    const cash = cashAvailabilityFactor(r.saleDate);
    if (cash >= 0.9) out.push({ label: "Long-time owner — high equity", tone: "pos" });
    else if (cash <= 0.3) out.push({ label: "Bought 2018–2021 — likely rate-locked", tone: "neg" });
  } else {
    if (r.hasEmail) out.push({ label: "Verified email on file", tone: "pos" });
    if (r.hasLinkedIn) out.push({ label: "LinkedIn profile linked", tone: "pos" });
    if (r.emailOptIn) out.push({ label: "Email opt-in active", tone: "pos" });
    if (!r.hasEmail && !r.hasLinkedIn) out.push({ label: "Missing digital channels", tone: "neg" });
  }
  return out;
}


export function scoreColor(score: number): string {
  if (score >= 7.5) return "#16a34a"; // hot — green
  if (score >= 5.5) return "#eab308"; // warm — amber
  return "#94a3b8"; // cold — slate
}

export function scoreLabel(score: number): "Hot" | "Warm" | "Cold" {
  if (score >= 7.5) return "Hot";
  if (score >= 5.5) return "Warm";
  return "Cold";
}

export function isICPMatch(r: AnyRecord): boolean {
  // "Looks like your best clients" — Villanova high-value + permit gap, Shore high-value beach homes
  if (r.segment === "vil") return r.marketValue >= 1_500_000 && r.permitCount <= 2;
  if (r.segment === "shore") return r.salePrice >= 1_500_000;
  return r.hasEmail && r.hasLinkedIn && r.emailOptIn;
}

// ─── ICP score (contact-level — "is this person worth pursuing?") ──
// Answers: how reachable + how qualified is the owner/contact, independent
// of the property's renovation opportunity. Five weighted signals:
//   • Contact completeness (email + phone + LinkedIn)        — 30%
//   • Email opt-in (warm inbox vs. cold mail only)           — 15%
//   • Prior-client relationship (CRM segment = ex-client)    — 25%
//   • Wealth proxy (market value / sale price band)          — 20%
//   • Geographic proximity (PA suburbs / shore-owner state)  — 10%
export function icpScore(r: AnyRecord): number {
  let completeness = 0;
  let optIn = 0;
  let prior = 0;
  let wealth = 0;
  let geo = 0;

  if (r.segment === "crm") {
    completeness =
      (r.hasEmail ? 0.4 : 0) + (r.hasPhone ? 0.3 : 0) + (r.hasLinkedIn ? 0.3 : 0);
    optIn = r.emailOptIn ? 1 : 0;
    prior = 1; // ex-client
    wealth = 0.6; // unknown — neutral
    geo = r.state === "PA" ? 1 : r.state === "NJ" ? 0.7 : 0.4;
  } else if (r.segment === "vil") {
    completeness = r.hasLinkedIn ? 0.7 : 0.3; // LinkedIn = partial reachability
    optIn = 0.3; // cold — no opt-in known
    prior = 0; // not yet a client
    wealth = Math.max(0, Math.min(1, r.marketValue / 3_000_000));
    geo = 1; // Villanova = core service area
  } else {
    // shore
    completeness = r.ownerMail ? 0.5 : 0.2;
    optIn = 0.2;
    prior = 0;
    wealth = Math.max(0, Math.min(1, r.salePrice / 5_000_000));
    geo = r.ownerMail?.includes(", PA") ? 0.9 : 0.4; // PA owners are reachable from HQ
  }

  const raw =
    completeness * 0.30 +
    optIn        * 0.15 +
    prior        * 0.25 +
    wealth       * 0.20 +
    geo          * 0.10;
  return Math.round(raw * 10 * 10) / 10;
}

export function icpLabel(score: number): "Strong fit" | "Possible fit" | "Weak fit" {
  if (score >= 7) return "Strong fit";
  if (score >= 4.5) return "Possible fit";
  return "Weak fit";
}

export function icpColor(score: number): string {
  if (score >= 7) return "#0a1b30";
  if (score >= 4.5) return "#7C8DA8";
  return "#C0C7D2";
}

export function icpDrivers(r: AnyRecord): { label: string; tone: "pos" | "neg" | "neu" }[] {
  const out: { label: string; tone: "pos" | "neg" | "neu" }[] = [];
  if (r.segment === "crm") {
    const channels = [r.hasEmail && "email", r.hasPhone && "phone", r.hasLinkedIn && "LinkedIn"].filter(Boolean);
    if (channels.length === 3) out.push({ label: "Fully reachable — email + phone + LinkedIn", tone: "pos" });
    else if (channels.length >= 1) out.push({ label: `Reachable via ${channels.join(" + ")}`, tone: "neu" });
    else out.push({ label: "No contact channels on file", tone: "neg" });
    out.push({ label: r.emailOptIn ? "Email opt-in active — warm inbox" : "Email opted out — direct mail only", tone: r.emailOptIn ? "pos" : "neg" });
    out.push({ label: "Prior Harth client — upsell vs. new acquisition", tone: "pos" });
  } else if (r.segment === "vil") {
    if (r.hasLinkedIn) out.push({ label: "Owner has LinkedIn profile — reachable", tone: "pos" });
    else out.push({ label: "Owner not yet matched to LinkedIn", tone: "neg" });
    if (r.marketValue >= 2_000_000) out.push({ label: `$${(r.marketValue / 1_000_000).toFixed(1)}M home — wealth proxy strong`, tone: "pos" });
    out.push({ label: "Villanova — core Harth service area", tone: "pos" });
  } else {
    if (r.ownerMail?.includes(", PA")) out.push({ label: "PA-based owner — reachable from HQ", tone: "pos" });
    else out.push({ label: "Out-of-area owner — harder to reach", tone: "neg" });
    if (r.salePrice >= 2_000_000) out.push({ label: `$${(r.salePrice / 1_000_000).toFixed(1)}M beach home — wealth proxy strong`, tone: "pos" });
  }
  return out;
}

// ─── Pipeline status (HubSpot-style) ────────────────────────
// Status answers: which bucket does this lead sit in, and how should the
// team act on it? Derived from opportunity score + recency of work + CRM
// relationship — not a free-text field.
export type RecordStatus = "Hot" | "Warm" | "Cold" | "Converted" | "Re-engagement";

export function recordStatus(r: AnyRecord): RecordStatus {
  if (r.segment === "crm") {
    // Ex-clients: opt-in still active → re-engagement candidate, else converted/dormant.
    return r.emailOptIn ? "Re-engagement" : "Converted";
  }
  const score = opportunityScore(r);
  // Recent permits → owner already renovated → cold for now.
  if (r.segment === "vil" && r.permitCount >= 3) return "Cold";
  const reachable =
    r.segment === "vil" ? r.hasLinkedIn :
    r.segment === "shore" ? Boolean(r.ownerMail) : true;
  if (score >= 7.5 && reachable) return "Hot";
  if (score >= 5.5) return "Warm";
  return "Cold";
}

export function statusColor(s: RecordStatus): string {
  switch (s) {
    case "Hot":           return "#DC2626"; // red
    case "Warm":          return "#F59E0B"; // amber
    case "Cold":          return "#94A3B8"; // slate
    case "Converted":     return "#0E8C5A"; // green
    case "Re-engagement": return "#7C3AED"; // violet
  }
}

export const allRecords: AnyRecord[] = [...vilData, ...shoreData, ...crmData];

export function recordTitle(r: AnyRecord): string {
  return r.segment === "crm" ? r.name : r.address;
}

export function recordCoords(r: AnyRecord): [number, number] {
  return [r.lng, r.lat];
}

// Harth Builders HQ — Spring House, PA (approx)
export const HARTH_OFFICE: { lat: number; lng: number } = { lat: 40.1850, lng: -75.1955 };

// Distance in miles between two lat/lng points (haversine).
export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ─── Case study presets ─────────────────────────────────────
export type CaseStudy = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  segment: Segment | "all";
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
  insight: string;
};

export const caseStudies: CaseStudy[] = [
  {
    id: "shore",
    title: "NJ Shore Cluster",
    subtitle: "15 beach-block properties · Margate → Cape May",
    emoji: "🌊",
    segment: "shore",
    center: [-74.7, 39.15],
    zoom: 8.8,
    pitch: 35,
    insight:
      "From Margate down to Cape May Point — single-families, beach-block teardown candidates, and condo flips. Mix of recent $2M+ sales and long-held assessed-value holdouts ripe for outreach.",
  },
  {
    id: "crm",
    title: "Ex-Client Re-engagement",
    subtitle: "15 contacts with email, phone, and LinkedIn",
    emoji: "👥",
    segment: "crm",
    center: [-75.18, 40.17],
    zoom: 10.5,
    insight:
      "Every contact is reachable on 3+ channels. 11 are still on your email list — ready for a 'kitchens & baths' upsell drop.",
  },
  {
    id: "vil",
    title: "Villanova Main Line",
    subtitle: "17 homes $0.9M–$5.4M with detailed permit history",
    emoji: "🏛️",
    segment: "vil",
    center: [-75.353, 40.035],
    zoom: 13.2,
    pitch: 45,
    insight:
      "1880–2009 builds spanning Radnor & Lower Merion. 45 permits on file — renovation, additions, roofs and HVAC — let you see who's been spending on the house and who's overdue.",
  },
];
