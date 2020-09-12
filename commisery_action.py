#!/usr/bin/env python3

# Copyright (C) 2020-2020, TomTom (http://tomtom.com).
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import click
import re
import subprocess

from github import Github


def convert_to_multiline(text: str) -> str:
    return text.replace('\n', '%0A')


def strip_ansicolors(text: str) -> str:
    return re.sub('\x1b\\[(K|.*?m)', '', text)


def error_message(message: str, options: dict = {}):
    error = '::error '

    for key, value in options.items():
        error += f'{key}={value},'

    error = error[:-1]
    message = strip_ansicolors(convert_to_multiline(message))
    error += f'::{message}'

    print(error)


@click.command()
@click.option('-t', '--token',
              required=True, help='GitHub Token')
@click.option('-r', '--repository',
              required=True,  help='GitHub repository')
@click.option('-p', '--pull-request-id',
              required=True, help='Pull Request identifier')
def main(token: str, repository: str, pull_request_id: int) -> int:
    errors = 0

    repo = Github(token).get_repo(repository)
    pr = repo.get_pull(int(pull_request_id))
    commits = pr.get_commits()

    for commit in commits:
        proc = subprocess.Popen(
            ["commisery-verify-msg", commit.sha],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = proc.communicate()

        if proc.returncode > 0:
            error_message(stderr.decode("utf-8"))
            errors += 1

    exit(1 if errors else 0)


if __name__ == '__main__':
    main()
