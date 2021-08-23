import moment, { Moment } from "moment";

export interface PackageMetadata {
  name: string;
  lastModified: string; //in UTC
  xyz: number[];
  urls: string[];
  sizeInMib: number;
}

export interface FeatureProperties {
  title: string;
  xyz: number[];
}

export class CompoundPackageMetadata {
  private xyz: number[];
  private packages: PackageMetadata[] = [];

  constructor(xyz: number[]) {
    this.xyz = xyz;
  }

  addPackage(metadata: PackageMetadata): void {
    this.packages.push(metadata);
  }

  getSizeInMiB(): number {
    return this.packages.reduce((sum, p) => sum + (+p.sizeInMib), 0);
  }

  getName(): string {
    const [x, y, z] = this.xyz;
    return `${x}-${y}-${z}`;
  }

  getLastModified(): Moment {
    if (this.packages.length === 0) {
      return undefined;
    }
    return moment.max(this.packages.map(p => moment(p.lastModified)));
  }

  getUrls(): string[] {
    return this.packages.map((p) => p.urls).reduce((a, b) => a.concat(b), []);
  }

  getXYZ(): number[] {
    return this.xyz;
  }
}