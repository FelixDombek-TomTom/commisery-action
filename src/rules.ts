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

import * as difflib from "difflib";

import { ConventionalCommitMetadata } from "./commit";
import { Configuration } from "./config";
import { LlvmError, LlvmRange } from "./logging";

export interface IConventionalCommitRule {
  description: string;
  id: string;

  validate: (
    message: ConventionalCommitMetadata,
    config: Configuration
  ) => void;
}

/**
 * Validates the commit message against the specified ruleset
 */
export function validateRules(
  message: ConventionalCommitMetadata,
  config: Configuration
): LlvmError[] {
  const errors: LlvmError[] = [];

  const disabledRules = Object.entries(config.rules)
    .map(([k, v]) => (!v.enabled ? k : undefined))
    .filter((r): r is string => !!r);

  for (const rule of ALL_RULES) {
    try {
      if (!disabledRules.includes(rule.id)) {
        rule.validate(message, config);
      }
    } catch (error) {
      if (error instanceof LlvmError) {
        errors.push(error);
      } else {
        throw error;
      }
    }
  }

  return errors;
}

/**
 * The commit message's tag type should be in lower case
 */
class NonLowerCaseType implements IConventionalCommitRule {
  id = "C001";
  description = "The commit message's tag type should be in lower case";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    if (message.type === undefined) {
      return;
    }
    if (message.type.toLowerCase() !== message.type) {
      const msg = new LlvmError();
      msg.message = `[${this.id}] ${this.description}`;
      msg.line = message.subject;
      msg.column_number = new LlvmRange(
        message.subject.indexOf(message.type) + 1,
        message.type.length
      );
      msg.expectations = message.type.toLowerCase();

      throw msg;
    }
  }
}

/**
 * Only one empty line between subject and body
 */
class OneWhitelineBetweenSubjectAndBody implements IConventionalCommitRule {
  id = "C002";
  description = "Only one empty line between subject and body";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    if (message.body.length >= 2 && message.body[1].trim() === "") {
      const msg = new LlvmError();
      msg.message = `[${this.id}] ${this.description}`;
      msg.line = message.subject;

      throw msg;
    }
  }
}

/**
 * The commit message's description should not start with a capital case letter
 */
class TitleCaseDescription implements IConventionalCommitRule {
  id = "C003";
  description =
    "The commit message's description should not start with a capital case letter";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    if (
      message.description &&
      !message.description.startsWith(message.description[0].toLowerCase())
    ) {
      const msg = new LlvmError();
      msg.message = `[${this.id}] ${this.description}`;
      msg.line = message.subject;
      msg.column_number = new LlvmRange(
        message.subject.indexOf(message.description) + 1
      );
      msg.expectations = message.description[0].toLowerCase();

      throw msg;
    }
  }
}

/**
 * Commit message's subject should not contain an unknown tag type
 */
class UnknownTagType implements IConventionalCommitRule {
  id = "C004";
  description =
    "Commit message's subject should not contain an unknown tag type";

  validate(message: ConventionalCommitMetadata, config: Configuration): void {
    if (message.type === undefined) {
      return;
    }

    if (!(message.type in config.tags)) {
      const matches = difflib.getCloseMatches(
        message.type.toLowerCase(),
        Object.keys(config.tags)
      );
      const closest_match = matches
        ? matches[0]
        : Object.keys(config.tags).join(", ");

      const msg = new LlvmError();
      msg.message = `[${this.id}] ${
        this.description
      }. Use one of: ${Object.keys(config.tags).join(", ")}`;
      msg.line = message.subject;
      msg.column_number = new LlvmRange(
        message.subject.indexOf(message.type) + 1,
        message.type.length
      );
      msg.expectations = closest_match;

      throw msg;
    }
  }
}

/**
 * Only one whitespace allowed after the ":" separator
 */
class SeparatorContainsTrailingWhitespaces implements IConventionalCommitRule {
  id = "C005";
  description = 'Only one whitespace allowed after the ":" separator';

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    if (message.separator === null) {
      return;
    }

    if (message.separator !== ": ") {
      const msg = new LlvmError();
      msg.message = `[${this.id}] ${this.description}`;
      msg.line = message.subject;
      msg.column_number = new LlvmRange(
        message.subject.indexOf(message.separator) + 1,
        message.separator.length
      );
      msg.expectations = `: `;

      throw msg;
    }
  }
}

/**
 * The commit message's scope should not be empty
 */
class ScopeShouldNotBeEmpty implements IConventionalCommitRule {
  id = "C006";
  description = "The commit message's scope should not be empty";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    if (message.scope === undefined) {
      return;
    }

    if (!message.scope.trim()) {
      const msg = new LlvmError();

      msg.message = `[${this.id}] ${this.description}`;
      msg.line = message.subject;
      msg.column_number = new LlvmRange(
        message.subject.indexOf("(") + 1,
        message.scope.length + 2
      );

      throw msg;
    }
  }
}

/**
 * The commit message's scope should not contain any whitespacing
 */
class ScopeContainsWhitespace implements IConventionalCommitRule {
  id = "C007";
  description =
    "The commit message's scope should not contain any whitespacing";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    if (message.scope && message.scope.length !== message.scope.trim().length) {
      const msg = new LlvmError();
      msg.message = `[${this.id}] ${this.description}`;
      msg.line = message.subject;
      msg.column_number = new LlvmRange(
        message.subject.indexOf("(") + 2,
        message.scope.length
      );
      msg.expectations = message.scope.trim();

      throw msg;
    }
  }
}

/**
 * The commit message's subject requires a separator (": ") after the type tag
 */
class MissingSeparator implements IConventionalCommitRule {
  id = "C008";
  description = `The commit message's subject requires a separator (": ") after the type tag`;

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    if (message.separator === undefined || !message.separator.includes(":")) {
      const msg = new LlvmError();
      msg.message = `[${this.id}] ${this.description}`;
      msg.line = message.subject;
      if (message.scope) {
        msg.column_number = new LlvmRange(
          message.subject.indexOf(message.scope) + message.scope.length + 2
        );
      } else if (message.breaking_change) {
        msg.column_number = new LlvmRange(
          message.subject.indexOf(message.breaking_change)
        );
      } else {
        msg.column_number = new LlvmRange(message.subject.indexOf(" ") + 1);
      }
      msg.expectations = `:`;

      throw msg;
    }
  }
}

/**
 * The commit message requires a description
 */
class MissingDescription implements IConventionalCommitRule {
  id = "C009";
  description = "The commit message requires a description";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    if (!message.description) {
      const msg = new LlvmError();
      msg.message = `[${this.id}] ${this.description}`;
      msg.line = message.subject;
      msg.column_number = new LlvmRange(message.subject.length + 2);

      throw msg;
    }
  }
}

/**
 * No whitespace allowed around the "!" indicator
 */
class BreakingIndicatorContainsWhitespacing implements IConventionalCommitRule {
  id = "C010";
  description = 'No whitespace allowed around the "!" indicator';

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    if (
      message.breaking_change &&
      message.breaking_change.trim() !== message.breaking_change
    ) {
      const msg = new LlvmError();
      msg.message = `[${this.id}] ${this.description}`;
      msg.line = message.subject;
      msg.column_number = new LlvmRange(
        message.subject.indexOf(message.breaking_change) + 1,
        message.breaking_change.length + message.separator.trimEnd().length
      );
      msg.expectations = `!:`;

      throw msg;
    }
  }
}

/**
 * Breaking separator should consist of only one indicator
 */
class OnlySingleBreakingIndicator implements IConventionalCommitRule {
  id = "C011";
  description = "Breaking separator should consist of only one indicator";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    if (message.breaking_change && message.breaking_change.trim().length > 1) {
      const msg = new LlvmError();
      msg.message = `[${this.id}] ${this.description}`;
      msg.line = message.subject;
      msg.column_number = new LlvmRange(
        message.subject.indexOf(message.breaking_change) + 1,
        message.breaking_change.length + 1
      );
      msg.expectations = `!:`;

      throw msg;
    }
  }
}

/**
 * The commit message's subject requires a type
 */
class MissingTypeTag implements IConventionalCommitRule {
  id = "C012";
  description = "The commit message's subject requires a type";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    if (!message.type) {
      const msg = new LlvmError();
      msg.message = `[${this.id}] ${this.description}`;
      msg.line = message.subject;

      throw msg;
    }
  }
}

/**
 * The commit message's subject should not end with punctuation
 */
class SubjectShouldNotEndWithPunctuation implements IConventionalCommitRule {
  id = "C013";
  description = "The commit message's subject should not end with punctuation";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    if (message.description.match(/.*[.!?,]$/)) {
      const msg = new LlvmError();
      msg.message = `[${this.id}] ${this.description}`;
      msg.line = message.subject;
      msg.column_number = new LlvmRange(message.subject.length);

      throw msg;
    }
  }
}

/**
 * The commit message's subject should be within the line length limit
 */
class SubjectExceedsLineLengthLimit implements IConventionalCommitRule {
  id = "C014";
  description =
    "The commit message's subject should be within the line length limit";

  validate(message: ConventionalCommitMetadata, config: Configuration): void {
    if (message.subject.length > config.max_subject_length) {
      const msg = new LlvmError();
      msg.message = `[${this.id}] ${this.description} (${
        config.max_subject_length
      }), exceeded by ${
        message.subject.length - config.max_subject_length + 1
      } characters`;
      msg.line = message.subject;
      msg.column_number = new LlvmRange(
        config.max_subject_length,
        message.subject.length - config.max_subject_length + 1
      );

      throw msg;
    }
  }
}

/**
 * Description should not start with a repetition of the tag
 */
class NoRepeatedTags implements IConventionalCommitRule {
  id = "C015";
  description = "Description should not start with a repetition of the tag";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    if (message.description === undefined || message.type === undefined) {
      return;
    }
    if (
      message.description.split(" ")[0].toLowerCase() ===
      message.type.toLowerCase()
    ) {
      const msg = new LlvmError();
      msg.message = `[${this.id}] ${this.description}`;
      msg.line = message.subject;
      msg.column_number = new LlvmRange(
        message.subject.indexOf(message.separator) +
          message.separator.length +
          1,
        message.type.length
      );

      throw msg;
    }
  }
}

/**
 * The commit message's description should be written in imperative mood
 */
class DescriptionInImperativeMood implements IConventionalCommitRule {
  id = "C016";
  description =
    "The commit message's description should be written in imperative mood";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    const common_non_imperative_verbs = [
      "added",
      "adds",
      "adding",
      "applied",
      "applies",
      "applying",
      "edited",
      "edits",
      "editing",
      "expanded",
      "expands",
      "expanding",
      "fixed",
      "fixes",
      "fixing",
      "removed",
      "removes",
      "removing",
      "renamed",
      "renames",
      "renaming",
      "deleted",
      "deletes",
      "deleting",
      "updated",
      "updates",
      "updating",
      "ensured",
      "ensures",
      "ensuring",
      "resolved",
      "resolves",
      "resolving",
      "verified",
      "verifies",
      "verifying",
    ];
    if (
      message.description.match(
        new RegExp(`^(${common_non_imperative_verbs.join("|")})`, "i")
      )
    ) {
      const msg = new LlvmError();
      msg.message = `[${this.id}] ${this.description}`;
      msg.line = message.subject;
      msg.column_number = new LlvmRange(
        message.subject.indexOf(message.description) + 1,
        message.description.split(" ")[0].length
      );

      throw msg;
    }
  }
}

/**
 * Subject should not contain reference to review comments
 */
class SubjectContainsReviewRemarks implements IConventionalCommitRule {
  id = "C017";
  description = "Subject should not contain reference to review comments";

  validate(_: ConventionalCommitMetadata, __: Configuration): void {
    // TODO: implement this rule
  }
}

/**
 * The commit message should contain an empty line between subject and body
 */
class MissingEmptyLineBetweenSubjectAndBody implements IConventionalCommitRule {
  id = "C018";
  description =
    "The commit message should contain an empty line between subject and body";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    if (message.body && message.body[0]) {
      const msg = new LlvmError();
      msg.message = `[${this.id}] ${this.description}`;

      throw msg;
    }
  }
}

/**
 * The commit message's subject should not contain a ticket reference
 */
class SubjectContainsIssueReference implements IConventionalCommitRule {
  id = "C019";
  description =
    "The commit message's subject should not contain a ticket reference";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    const ISSUE_REGEX = new RegExp(`[A-Z]+-[0-9]+`, "g");
    const matches = message.subject.matchAll(ISSUE_REGEX);

    for (const match of matches) {
      let err = true;
      for (const ignore of ["AES-", "PEP-", "SHA-", "UTF-", "VT-"]) {
        if (match[0].startsWith(ignore)) {
          err = false;
        }
      }
      if (err) {
        const msg = new LlvmError();
        msg.message = `[${this.id}] ${this.description}`;
        msg.line = message.subject;

        throw msg;
      }
    }
  }
}

/**
 * Git-trailer should not contain whitespace(s)
 */
class GitTrailerContainsWhitespace implements IConventionalCommitRule {
  id = "C020";
  description = "Git-trailer should not contain whitespace(s)";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    for (const item of message.footers) {
      if (item.token.includes(" ")) {
        const msg = new LlvmError();
        msg.message = `[${this.id}] ${this.description}`;
        msg.line = `${item.token}: ${item.value}`;
        msg.column_number = new LlvmRange(1, item.token.length);
        msg.expectations = item.token.replace(/ /g, "-");

        throw msg;
      }
    }
  }
}

/**
 * Footer should not contain any blank line(s)
 */
class FooterContainsBlankLine implements IConventionalCommitRule {
  id = "C022";
  description = "Footer should not contain any blank line(s)";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    for (const item of message.footers) {
      if (!item.token || item.value.length === 0) {
        const msg = new LlvmError();
        msg.message = `[${this.id}] ${this.description}`;

        throw msg;
      }
    }
  }
}

/**
 * The BREAKING CHANGE git-trailer should be the first element in the footer
 */
class BreakingChangeMustBeFirstGitTrailer implements IConventionalCommitRule {
  id = "C023";
  description =
    "The BREAKING CHANGE git-trailer should be the first element in the footer";

  validate(message: ConventionalCommitMetadata, _: Configuration): void {
    // eslint-disable-next-line github/array-foreach
    message.footers.forEach((item, index) => {
      if (item.token === "BREAKING-CHANGE") {
        if (index === 0) {
          return;
        }
        const msg = new LlvmError();
        msg.message = `[${this.id}] ${this.description}`;

        throw msg;
      }
    });
  }
}

/**
 * A colon is required in git-trailers
 */
class GitTrailerNeedAColon implements IConventionalCommitRule {
  id = "C024";
  description = "A colon is required in git-trailers";

  validate(message: ConventionalCommitMetadata, config: Configuration): void {
    const trailer_formats = [
      /^Addresses:* (?:[A-Z]+-[0-9]+|#[0-9]+)/,
      /^Closes:* (?:[A-Z]+-[0-9]+|#[0-9]+)/,
      /^Fixes:* (?:[A-Z]+-[0-9]+|#[0-9]+)/,
      /^Implements:* (?:[A-Z]+-[0-9]+|#[0-9]+)/,
      /^References:* (?:[A-Z]+-[0-9]+|#[0-9]+)/,
      /^Refs:* (?:[A-Z]+-[0-9]+|#[0-9]+)/,
      /^Acked-by/,
      /^Authored-by/,
      /^BREAKING CHANGE/,
      /^BREAKING-CHANGE/,
      /^Co-authored-by/,
      /^Helped-by/,
      /^Merged-by/,
      /^Reported-by/,
      /^Reviewed-by/,
      /^Signed-off-by/,
    ];
    // If a trailer doesn't have a colon, it won't be in the footers list,
    // so we examine the body here, from the bottom to the top.
    for (let i = message.body.length - 1; i >= 0; --i) {
      const line = message.body[i];

      // The one exception we need to handle is "BREAKING CHANGE"
      const checkLine = line.replace(/^BREAKING CHANGE/, "BREAKING-CHANGE");
      if (trailer_formats.some(key => checkLine.match(key))) {
        if (checkLine.match(/^[A-Za-z0-9-]+ /)) {
          const msg = new LlvmError();
          const idx = checkLine.indexOf(" ");

          msg.message = `[${this.id}] ${this.description}`;
          msg.line = line;
          msg.column_number = new LlvmRange(
            idx + 1,
            line.substring(idx).length
          );
          msg.expectations = `: ${line.substring(idx + 1)}`;

          throw msg;
        }
      }
    }
  }
}

/**
 * Only a single ticket or issue must be referenced per trailer
 */
class SingleTicketReferencePerTrailer implements IConventionalCommitRule {
  id = "C025";
  description = "Only a single ticket or issue may be referenced per trailer";

  validate(message: ConventionalCommitMetadata, config: Configuration): void {
    const C025_RE = new RegExp(/([A-Z]+-[0-9]+|#[0-9]+)/g);

    for (const item of message.footers) {
      let matches: RegExpExecArray | null;
      C025_RE.lastIndex = 0;

      if ((matches = C025_RE.exec(item.value))) {
        // One match is fine, two or more matches is invalid
        if ((matches = C025_RE.exec(item.value))) {
          const tokenAndSeparator = `${item.token}: `;
          const matchIndex = tokenAndSeparator.length + matches.index + 1;
          const msg = new LlvmError();
          msg.message = `[${this.id}] ${this.description}`;
          msg.line = `${tokenAndSeparator}${item.value}`;
          msg.column_number = new LlvmRange(
            matchIndex,
            tokenAndSeparator.length + item.value.length - matchIndex + 1
          );

          throw msg;
        }
      }
    }
  }
}

export const ALL_RULES = [
  new NonLowerCaseType(),
  new OneWhitelineBetweenSubjectAndBody(),
  new TitleCaseDescription(),
  new UnknownTagType(),
  new SeparatorContainsTrailingWhitespaces(),
  new ScopeShouldNotBeEmpty(),
  new ScopeContainsWhitespace(),
  new MissingSeparator(),
  new MissingDescription(),
  new BreakingIndicatorContainsWhitespacing(),
  new OnlySingleBreakingIndicator(),
  new MissingTypeTag(),
  new SubjectShouldNotEndWithPunctuation(),
  new SubjectExceedsLineLengthLimit(),
  new NoRepeatedTags(),
  new DescriptionInImperativeMood(),
  new SubjectContainsReviewRemarks(),
  new MissingEmptyLineBetweenSubjectAndBody(),
  new SubjectContainsIssueReference(),
  new GitTrailerContainsWhitespace(),
  new FooterContainsBlankLine(),
  new BreakingChangeMustBeFirstGitTrailer(),
  new GitTrailerNeedAColon(),
  new SingleTicketReferencePerTrailer(),
];

export function getConventionalCommitRule(id: string): IConventionalCommitRule {
  for (const rule of ALL_RULES) {
    if (rule.id === id) {
      return rule;
    }
  }
  throw new Error(`Unknown rule: ${id}`);
}
