import React from 'react';

import CustomLink from '@/components/CustomLink';
import Datatable from '@/components/Datatable/ShowPage';
export default function Home() {
  return (
    <>
      <main>
        <section className=''>
          <div className='flex flex-col items-center justify-start min-h-screen text-white layout'>
          <Datatable/>
            <footer className='absolute text-gray-300 bottom-2'>
              © {new Date().getFullYear()}{' '}
              <CustomLink href='https://theodorusclarence.com'>
                QuickForm
              </CustomLink>
            </footer>
          </div>
        </section>
      </main>
    </>
  );
}
