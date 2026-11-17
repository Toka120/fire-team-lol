// Version Microsoft Store de FIRE Launcher : le launcher installe FIRE Team, FIRE Kiting et FIRE Listen comme des programmes
// normaux de Windows. Sans ces réglages, Windows « enfermerait » ces installations dans le paquet du Store (dossiers et registre
// virtualisés) : FIRE Team serait invisible hors du launcher. Capacité restreinte « unvirtualizedResources » (Windows 10 2004+).
// À lancer depuis le dossier launcher/, après npm install et avant electron-builder --win appx.
const fs = require('fs');
const f = require.resolve('app-builder-lib/templates/appx/appxmanifest.xml');
let s = fs.readFileSync(f, 'utf8');
if (!s.includes('desktop6:')) {
  s = s.replace('xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities">',
    'xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"\n   xmlns:desktop6="http://schemas.microsoft.com/appx/manifest/desktop/windows10/6"\n   IgnorableNamespaces="desktop6">');
  s = s.replace('    <Logo>${logo}</Logo>\n  </Properties>',
    '    <Logo>${logo}</Logo>\n    <desktop6:FileSystemWriteVirtualization>disabled</desktop6:FileSystemWriteVirtualization>\n    <desktop6:RegistryWriteVirtualization>disabled</desktop6:RegistryWriteVirtualization>\n  </Properties>');
  s = s.replace('<rescap:Capability Name="runFullTrust"/>', '<rescap:Capability Name="runFullTrust"/>\n    <rescap:Capability Name="unvirtualizedResources"/>');
  fs.writeFileSync(f, s);
}
const ok = ['desktop6:FileSystemWriteVirtualization', 'desktop6:RegistryWriteVirtualization', 'unvirtualizedResources', 'IgnorableNamespaces'].every((k) => s.includes(k));
console.log(ok ? 'manifeste Store prêt' : 'ECHEC manifeste Store');
if (!ok) process.exit(1);
