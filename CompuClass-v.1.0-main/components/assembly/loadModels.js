import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ASSEMBLY_PARTS } from './catalog';
import { framePart } from './framePart';
import { buildCooler, buildRam } from './placeholders';

const TINY = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const COMPONENT_GLTF = require('../../assets/3D_models/computer_components/scene.gltf');
const COMPONENT_BIN = require('../../assets/3D_models/computer_components/scene.bin');
const BOARD_GLTF = require('../../assets/3D_models/motherbard/scene.gltf');
const BOARD_BIN = require('../../assets/3D_models/motherbard/scene.bin');

// Downscaled copies of the PC Lab textures. The originals are multi-megabyte
// scans; a mid-range phone cannot decode all of them just to seat a part.
const COMPONENT_IMAGES = {
  'textures/CPU.000_baseColor.jpeg': require('../../assets/assembly-lite/cpu-board.jpg'),
  'textures/CPU.001_baseColor.jpeg': require('../../assets/assembly-lite/cpu-top.jpg'),
  'textures/material_baseColor.jpeg': require('../../assets/assembly-lite/ram.jpg'),
  'textures/SSD.002_baseColor.jpeg': require('../../assets/assembly-lite/ssd.jpg'),
  'textures/SATA_connector.000_baseColor.jpeg': require('../../assets/assembly-lite/sata.jpg'),
  'textures/PSU.000_baseColor.jpeg': require('../../assets/assembly-lite/psu-0.jpg'),
  'textures/PSU.001_baseColor.jpeg': require('../../assets/assembly-lite/psu-1.jpg'),
  'textures/PSU.002_baseColor.jpeg': require('../../assets/assembly-lite/psu-2.jpg'),
  'textures/PSU.003_baseColor.jpeg': require('../../assets/assembly-lite/psu-3.jpg'),
};

const BOARD_IMAGES = {
  'textures/matherboard_textolite_electronik_components_baseColor.png': require('../../assets/assembly-lite/motherboard.jpg'),
};

const AXES = Object.fromEntries(ASSEMBLY_PARTS.map((part) => [part.id, part.axes]));

async function resolveAsset(mod) {
  const asset = Asset.fromModule(mod);
  if (!asset.localUri && !asset.uri) {
    try { await asset.downloadAsync(); } catch { /* the web uri is already usable */ }
  }
  return asset.localUri || asset.uri;
}

async function loadable(uri) {
  if (!uri) return uri;
  if (uri.startsWith('file:') || uri.startsWith('content:')) {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const mime = /\.png($|\?)/i.test(uri) ? 'image/png' : /\.jpe?g($|\?)/i.test(uri) ? 'image/jpeg' : 'application/octet-stream';
    return `data:${mime};base64,${base64}`;
  }
  return uri;
}

async function readJson(uri) {
  if (uri.startsWith('file:') || uri.startsWith('content:')) {
    return JSON.parse(await FileSystem.readAsStringAsync(uri));
  }
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Could not read a 3D part (${response.status})`);
  return response.json();
}

function extractNamed(scene, name) {
  scene.updateMatrixWorld(true);
  const node = scene.getObjectByName(name);
  if (!node?.parent) return null;
  const parentWorld = node.parent.matrixWorld.clone();
  node.parent.remove(node);
  node.applyMatrix4(parentWorld);
  return node;
}

async function loadGltf(gltfModule, binModule, images) {
  const [gltfUri, binUri] = await Promise.all([resolveAsset(gltfModule), resolveAsset(binModule)]);
  const json = await readJson(gltfUri);
  json.buffers[0].uri = await loadable(binUri);
  const mapped = {};
  await Promise.all(Object.entries(images).map(async ([key, mod]) => {
    mapped[key] = await loadable(await resolveAsset(mod));
  }));
  (json.images || []).forEach((image) => {
    image.uri = mapped[image.uri] || TINY;
  });
  (json.materials || []).forEach((material) => {
    delete material.normalTexture;
    delete material.occlusionTexture;
    delete material.emissiveTexture;
    delete material.extensions;
    if (material.pbrMetallicRoughness) delete material.pbrMetallicRoughness.metallicRoughnessTexture;
  });
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(JSON.stringify(json), '', resolve, reject);
  });
}

export async function loadAssemblyModels() {
  const loaded = {};
  try {
    const components = await loadGltf(COMPONENT_GLTF, COMPONENT_BIN, COMPONENT_IMAGES);
    const cpu = extractNamed(components.scene, 'CPU');
    const ram = extractNamed(components.scene, 'RAM');
    const ssd = extractNamed(components.scene, '2.5inch_SSD');
    const sink = extractNamed(components.scene, 'HeatSink');
    const psu = extractNamed(components.scene, 'PSU');
    if (cpu) loaded.cpu = framePart(cpu, AXES.cpu);
    if (ram) loaded.ram = buildRam(ram, AXES.ram);
    if (ssd) loaded.storage = framePart(ssd, AXES.storage);
    if (sink) loaded.cooler = buildCooler(sink, AXES.cooler);
    if (psu) loaded.psu = framePart(psu, AXES.psu);
  } catch (error) {
    console.warn('CompuClass part models', error);
  }
  try {
    const board = await loadGltf(BOARD_GLTF, BOARD_BIN, BOARD_IMAGES);
    loaded.motherboard = framePart(board.scene, AXES.motherboard);
  } catch (error) {
    console.warn('CompuClass motherboard model', error);
  }
  return loaded;
}
