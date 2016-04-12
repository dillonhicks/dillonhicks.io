import argparse
import os
import re

from pathlib import Path, PurePath

from jinja2 import Template, FileSystemLoader, Environment
from collections import namedtuple, defaultdict, MappingView, OrderedDict


Link = namedtuple('Link', ('link', 'caption'))
Project = namedtuple('Project', ('date', 'name', 'link', 'image', 'description'))

excludes = set((
    'base.html',
))

navigation = (
    Link('index.html', 'Dillon'),
    Link('dillonhicks-resume.pdf', 'Résumé'),
    Link('projects.html', 'Projects'),
    Link('contact.html', 'Contact'),
)

ctx_by_match = defaultdict(lambda: dict)
ctx_by_name = defaultdict(lambda: dict)

def register_named_ctx(name, func):
    if name in ctx_by_name:
        raise RuntimeError(
            'function {}() duplicates context for template {}'
            .format(func.__name__, name))

    ctx_by_name[name] = func
    return func

def register_matched_ctx(pattern, func):
    if pattern in ctx_by_match:
        raise RuntimeError(
            'function {}() duplicates context for templates matching {}'
            .format(func.__name__, pattern))

    ctx_by_match[pattern] = func
    return func


class context_for(object):
    """register context generator methods by template name with decorators"""

    def __init__(self, string, regex=False):
        self.string = string
        self.regex = regex

    def __call__(self, func):
        if self.regex:
            return register_matched_ctx(self.string, func)
        return register_named_ctx(self.string, func)


def create_context(name):

    ctx_funcs = []
    for pattern, func in ctx_by_match.items():
        if re.match(pattern, name):
            ctx_funcs.append(func)

    ctx_funcs.append(ctx_by_name[name])

    context = {}
    for f in ctx_funcs:
        context.update(f())

    return context



@context_for('^.+html$', regex=True)
def base_ctx():
    return {
        'navigation' : navigation
    }


@context_for('projects.html')
def proj_ctx():
    dillonio = Project(
        date='April 2016',
        name='DillonHicks.io',
        link='https://github.com/vengefuldrx/dillonhicks.io',
        image='img/dillonhicksioflavicon.jpg',
        description='A game I developed on a Saturday morning to learn more about JavaScript.')

    breakout = Project(
        date='April 2016',
        name='Breakout',
        link='proj-breakout.html',
        image='img/breakout.png',
        description='A game I developed on a Saturday morning to learn more about JavaScript.')


    return {
        'projects' : (
            dillonio,
            breakout,
        )
    }


def parse_args():
    parser = argparse.ArgumentParser(
        description='Render templates',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)

    parser.add_argument('-i', '--in', type=str, action='store',
                        required=True, help='Source directory',
                        dest='src_path')

    parser.add_argument('-o', '--out', type=Path, action='store',
                         required=True, help='Output directory',
                         dest='dest_path')

    args = parser.parse_args()
    return args


def main():
    args = parse_args()

    env = Environment(loader=FileSystemLoader(args.src_path))
    template_names = env.list_templates(filter_func=lambda t: t not in excludes)

    for t_name in template_names:

        path = args.dest_path / PurePath(t_name)
        context = create_context(t_name)

        try:
            path.parent.mkdir(parents=True)
        except FileExistsError: pass

        print('Writing: {}'.format(path))
        with path.open('w') as outfile:
            outfile.write(env.get_template(t_name).render(context))



if __name__ == '__main__':
    main()
