/**
 * Copyright (C) 2022, TomTom (http://tomtom.com).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import dedent from "dedent";

import { SemVer, SemVerType } from "../src/semver";

describe("Semantic Version parsing correct input", () => {
  test("Full", () => {
    expect(SemVer.from_string("some-prefix-1.2.3-4+5")).toStrictEqual(
      new SemVer(1, 2, 3, "4", "5", "some-prefix-")
    );
  });
  test("No prefix", () => {
    expect(SemVer.from_string("1.2.3-4+5")).toStrictEqual(
      new SemVer(1, 2, 3, "4", "5", "")
    );
  });
  test("No prefix and build", () => {
    expect(SemVer.from_string("1.2.3-4")).toStrictEqual(
      new SemVer(1, 2, 3, "4", "", "")
    );
  });
  test("No prefix and prerelease", () => {
    expect(SemVer.from_string("1.2.3+5")).toStrictEqual(
      new SemVer(1, 2, 3, "", "5", "")
    );
  });
  test("No prerelease and build", () => {
    expect(SemVer.from_string("v1.2.3")).toStrictEqual(
      new SemVer(1, 2, 3, "", "", "v")
    );
  });
});

describe("Semantic Version lossless stringification", () => {
  test("All fields", () => {
    const input = "version1.2.3-5+678";
    expect(SemVer.from_string(input)?.to_string()).toEqual(input);
  });
  test("Major, minor, patch", () => {
    const input = "1.2.3";
    expect(SemVer.from_string(input)?.to_string()).toEqual(input);
  });
  test("Major, minor, patch, build", () => {
    const input = "1.2.3+5";
    expect(SemVer.from_string(input)?.to_string()).toEqual(input);
  });
  test("Prefix, Major, minor, patch, prerelease", () => {
    const input = "version-1.2.3-prerelease";
    expect(SemVer.from_string(input)?.to_string()).toEqual(input);
  });
});

describe("Semantic Version parsing incorrect input", () => {
  test("Random non-semantic version", () => {
    expect(SemVer.from_string("version_1-2-3")).toBeNull();
  });
  test("Invalid characters in prefix", () => {
    expect(SemVer.from_string("version_1.2.3-4")).toBeNull();
  });
  test("Only major and minor", () => {
    expect(SemVer.from_string("1.2-beta.1")).toBeNull();
  });
  test("Empty prerelease", () => {
    expect(SemVer.from_string("1.2.3-")).toBeNull();
  });
  test("Empty build", () => {
    expect(SemVer.from_string("1.2.3-1.2+")).toBeNull();
  });
  test("Empty prerelease and build", () => {
    expect(SemVer.from_string("1.2.3-+")).toBeNull();
  });
});

describe("Semantic Version bumping by type", () => {
  test("Bump major", () => {
    expect(
      SemVer.from_string("v1.2.3-4")?.bump(SemVerType.MAJOR)
    ).toStrictEqual(new SemVer(2, 0, 0, "", "", "v"));
  });
  test("Bump minor", () => {
    expect(
      SemVer.from_string("v1.2.3-4")?.bump(SemVerType.MINOR)
    ).toStrictEqual(new SemVer(1, 3, 0, "", "", "v"));
  });
  test("Bump patch on prerelease", () => {
    expect(
      SemVer.from_string("v1.2.3-4")?.bump(SemVerType.PATCH)
    ).toStrictEqual(new SemVer(1, 2, 3, "", "", "v"));
  });
  test("Bump patch", () => {
    expect(SemVer.from_string("v1.2.3")?.bump(SemVerType.PATCH)).toStrictEqual(
      new SemVer(1, 2, 4, "", "", "v")
    );
  });
});

describe("Semantic Version ordering", () => {
  test("Equality", () => {
    expect(
      SemVer.from_string("v1.2.3")?.equals(SemVer.from_string("v1.2.3")!)
    ).toBe(true);
  });
  test("Equality with different prefix", () => {
    expect(
      SemVer.from_string("prefix-one-1.2.3")?.equals(
        SemVer.from_string("prefix-two-1.2.3")!
      )
    ).toBe(true);
  });
  test("Minor less than major", () => {
    expect(
      SemVer.from_string("v1.3.3")?.lessThan(SemVer.from_string("v2.2.3")!)
    ).toBe(true);
  });
  test("Patch less than minor", () => {
    expect(
      SemVer.from_string("v1.2.4")?.lessThan(SemVer.from_string("v1.3.3")!)
    ).toBe(true);
  });
  test("Prerelease less than patch", () => {
    expect(
      SemVer.from_string("v1.2.3-4")?.lessThan(SemVer.from_string("v1.2.3")!)
    ).toBe(true);
  });
});
