import os
import argparse
from pathlib import Path, PurePath

from jinja2 import Template, FileSystemLoader, Environment
from collections import namedtuple, defaultdict, MappingView

Link = namedtuple('Link', ('link', 'caption'))

excludes = set((
    'base.html',
))

navigation = (
    Link('index.html', 'Dillon'),
    Link('dillonhicks-resume.pdf', 'Résumé'),
    Link('projects.html', 'Projects'),
    Link('contact.html', 'Contact'),
)

context = {
    'navigation' : navigation
}


ctx_by_name = defaultdict(lambda: dict)

class context_for(object):
    """register context methods with decorators"""

    def __init__(self, name):
        self.name = name

    def __call__(self, func):
        if self.name in ctx_by_name:
            raise RuntimeError(
                'function {}() duplicates context for template {}'
                .format(func.__name__, self.name))

        ctx_by_name[self.name] = func
        return func

@context_for('index.html')
def index_ctx():
    return {}


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

        try:
            path.parent.mkdir(parents=True)
        except FileExistsError: pass

        local_ctx = context.copy()
        local_ctx.update(ctx_by_name[path.name]())
        print('Writing: {}'.format(path))

        with path.open('w') as outfile:
            outfile.write(env.get_template(t_name).render(context))



if __name__ == '__main__':
    main()
