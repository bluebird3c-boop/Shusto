import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const medicines = [
  // Fever & Pain
  { name: 'Napa 500mg', category: 'Fever & Pain', price: 12, generic: 'Paracetamol', company: 'Beximco' },
  { name: 'Napa Extend', category: 'Fever & Pain', price: 15, generic: 'Paracetamol', company: 'Beximco' },
  { name: 'Ace 500mg', category: 'Fever & Pain', price: 12, generic: 'Paracetamol', company: 'Square' },
  { name: 'Ace Plus', category: 'Fever & Pain', price: 25, generic: 'Paracetamol + Caffeine', company: 'Square' },
  { name: 'Fast 500mg', category: 'Fever & Pain', price: 10, generic: 'Paracetamol', company: 'Acme' },
  { name: 'Xpa 500mg', category: 'Fever & Pain', price: 10, generic: 'Paracetamol', company: 'Aristopharma' },
  
  // Gastric & Acidity
  { name: 'Seclo 20mg', category: 'Gastric', price: 50, generic: 'Omeprazole', company: 'Square' },
  { name: 'Seclo 40mg', category: 'Gastric', price: 90, generic: 'Omeprazole', company: 'Square' },
  { name: 'Sergel 20mg', category: 'Gastric', price: 70, generic: 'Esomeprazole', company: 'Healthcare' },
  { name: 'Sergel 40mg', category: 'Gastric', price: 120, generic: 'Esomeprazole', company: 'Healthcare' },
  { name: 'Maxpro 20mg', category: 'Gastric', price: 70, generic: 'Esomeprazole', company: 'Reneta' },
  { name: 'Maxpro 40mg', category: 'Gastric', price: 120, generic: 'Esomeprazole', company: 'Reneta' },
  { name: 'Pantonix 20mg', category: 'Gastric', price: 60, generic: 'Pantoprazole', company: 'Incepta' },
  { name: 'Pantonix 40mg', category: 'Gastric', price: 100, generic: 'Pantoprazole', company: 'Incepta' },
  { name: 'Esonix 20mg', category: 'Gastric', price: 70, generic: 'Esomeprazole', company: 'Incepta' },
  { name: 'Nexum 20mg', category: 'Gastric', price: 70, generic: 'Esomeprazole', company: 'Square' },
  { name: 'Finix 20mg', category: 'Gastric', price: 60, generic: 'Rabeprazole', company: 'Opsonin' },
  
  // Allergy & Cold
  { name: 'Fexo 120mg', category: 'Allergy', price: 80, generic: 'Fexofenadine', company: 'Square' },
  { name: 'Fexo 180mg', category: 'Allergy', price: 110, generic: 'Fexofenadine', company: 'Square' },
  { name: 'Fenadin 120mg', category: 'Allergy', price: 80, generic: 'Fexofenadine', company: 'Reneta' },
  { name: 'Alatrol 10mg', category: 'Allergy', price: 30, generic: 'Cetirizine', company: 'Square' },
  { name: 'Atova 10mg', category: 'Allergy', price: 30, generic: 'Atorvastatin', company: 'Square' },
  { name: 'Deslor 5mg', category: 'Allergy', price: 40, generic: 'Desloratadine', company: 'Incepta' },
  { name: 'Bilastin 20mg', category: 'Allergy', price: 150, generic: 'Bilastine', company: 'Square' },
  
  // Antibiotics
  { name: 'Azithrocin 500mg', category: 'Antibiotic', price: 350, generic: 'Azithromycin', company: 'Square' },
  { name: 'Zithrin 500mg', category: 'Antibiotic', price: 350, generic: 'Azithromycin', company: 'Aristopharma' },
  { name: 'Tridosil 500mg', category: 'Antibiotic', price: 350, generic: 'Azithromycin', company: 'Incepta' },
  { name: 'Ciprocin 500mg', category: 'Antibiotic', price: 150, generic: 'Ciprofloxacin', company: 'Square' },
  { name: 'Fixocard 200mg', category: 'Antibiotic', price: 280, generic: 'Cefixime', company: 'Square' },
  { name: 'Cef-3 200mg', category: 'Antibiotic', price: 280, generic: 'Cefixime', company: 'Incepta' },
  { name: 'Fluclox 500mg', category: 'Antibiotic', price: 120, generic: 'Flucloxacillin', company: 'Square' },
  
  // Diabetes
  { name: 'Glim 2mg', category: 'Diabetes', price: 60, generic: 'Glimepiride', company: 'Square' },
  { name: 'Secrin 2mg', category: 'Diabetes', price: 60, generic: 'Glimepiride', company: 'Incepta' },
  { name: 'Combid 50/500', category: 'Diabetes', price: 180, generic: 'Metformin + Vildagliptin', company: 'Square' },
  { name: 'Gluco-M 500mg', category: 'Diabetes', price: 40, generic: 'Metformin', company: 'Square' },
  { name: 'Diaryl 2mg', category: 'Diabetes', price: 50, generic: 'Glimepiride', company: 'Healthcare' },
  
  // Blood Pressure & Heart
  { name: 'Osartil 50mg', category: 'Blood Pressure', price: 80, generic: 'Losartan', company: 'Incepta' },
  { name: 'Angilock 50mg', category: 'Blood Pressure', price: 80, generic: 'Losartan', company: 'Square' },
  { name: 'Bizoran 5/20', category: 'Blood Pressure', price: 120, generic: 'Amlodipine + Olmesartan', company: 'Square' },
  { name: 'Amlocard 5mg', category: 'Blood Pressure', price: 50, generic: 'Amlodipine', company: 'Square' },
  { name: 'Camlodin 5mg', category: 'Blood Pressure', price: 50, generic: 'Amlodipine', company: 'Square' },
  { name: 'Rovista 10mg', category: 'Heart', price: 150, generic: 'Rosuvastatin', company: 'Incepta' },
  { name: 'Rosu 10mg', category: 'Heart', price: 150, generic: 'Rosuvastatin', company: 'Square' },
  
  // Supplements & Vitamins
  { name: 'Calbo D', category: 'Supplements', price: 240, generic: 'Calcium + Vitamin D', company: 'Square' },
  { name: 'A-Cal DX', category: 'Supplements', price: 240, generic: 'Calcium + Vitamin D', company: 'Acme' },
  { name: 'Bextram Gold', category: 'Supplements', price: 300, generic: 'Multivitamin', company: 'Beximco' },
  { name: 'Filwel Gold', category: 'Supplements', price: 300, generic: 'Multivitamin', company: 'Square' },
  { name: 'Neobion', category: 'Supplements', price: 180, generic: 'Vitamin B1 B6 B12', company: 'Square' },
  { name: 'Neuro-B', category: 'Supplements', price: 180, generic: 'Vitamin B1 B6 B12', company: 'Square' },
  { name: 'Xinc 20mg', category: 'Supplements', price: 30, generic: 'Zinc Sulfate', company: 'Square' },
  { name: 'V-Plex', category: 'Supplements', price: 50, generic: 'Vitamin B Complex', company: 'Square' },
  
  // Asthma & Respiratory
  { name: 'Monas 10mg', category: 'Asthma', price: 150, generic: 'Montelukast', company: 'Acme' },
  { name: 'Provair 10mg', category: 'Asthma', price: 150, generic: 'Montelukast', company: 'Healthcare' },
  { name: 'Montene 10mg', category: 'Asthma', price: 150, generic: 'Montelukast', company: 'Incepta' },
  { name: 'Tofen 1mg', category: 'Asthma', price: 40, generic: 'Ketotifen', company: 'Beximco' },
  { name: 'Windel 2mg', category: 'Asthma', price: 20, generic: 'Salbutamol', company: 'Square' },
  
  // Anxiety & Sleep
  { name: 'Rivotril 0.5mg', category: 'Anxiety', price: 80, generic: 'Clonazepam', company: 'Roche' },
  { name: 'Disopan 0.5mg', category: 'Anxiety', price: 60, generic: 'Clonazepam', company: 'Incepta' },
  { name: 'Pase 0.5mg', category: 'Anxiety', price: 60, generic: 'Clonazepam', company: 'Square' },
  { name: 'Zolax 0.25mg', category: 'Anxiety', price: 40, generic: 'Alprazolam', company: 'Square' },
  { name: 'Sedno 5mg', category: 'Sleep', price: 50, generic: 'Nitrazepam', company: 'Square' },
  
  // Others
  { name: 'Orsaline-N', category: 'Diarrhea', price: 5, generic: 'Oral Rehydration Salt', company: 'SMC' },
  { name: 'Flagyl 400mg', category: 'Infection', price: 30, generic: 'Metronidazole', company: 'Sanofi' },
  { name: 'Filmet 400mg', category: 'Infection', price: 25, generic: 'Metronidazole', company: 'Square' },
  { name: 'Amodis 400mg', category: 'Infection', price: 25, generic: 'Metronidazole', company: 'Square' },
  { name: 'Joytip 750mg', category: 'Joint Pain', price: 450, generic: 'Glucosamine', company: 'Square' },
  { name: 'Cartilage 750mg', category: 'Joint Pain', price: 450, generic: 'Glucosamine', company: 'Healthcare' },
  { name: 'D-Rise 20000 IU', category: 'Supplements', price: 400, generic: 'Vitamin D3', company: 'Incepta' },
  { name: 'Sustacal', category: 'Nutrition', price: 1200, generic: 'Nutritional Supplement', company: 'Nestle' },
  { name: 'Horlicks 500g', category: 'Nutrition', price: 450, generic: 'Health Drink', company: 'Unilever' },
];

async function seed() {
  console.log('Seeding medicines with images...');
  for (const med of medicines) {
    const id = med.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    // Using a more medical-looking placeholder or a seed that gives consistent medical vibes
    const imageUrl = `https://picsum.photos/seed/${id}/400/300`;
    
    await setDoc(doc(db, 'medicines', id), {
      ...med,
      id,
      image: imageUrl,
      updatedAt: new Date().toISOString()
    });
    console.log(`Added: ${med.name}`);
  }
  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch(console.error);
