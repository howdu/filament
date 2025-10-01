<?php

use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;
use Filament\Tests\Fixtures\Livewire\Livewire;
use Filament\Tests\TestCase;
use Illuminate\Support\Str;

use function Filament\Tests\livewire;

uses(TestCase::class);

it('can get the value of a field', function (): void {
    livewire(new class extends Livewire
    {
        public function form(Schema $form): Schema
        {
            return $form
                ->components([
                    TextInput::make('foo')
                        ->live(),
                    TextInput::make('bar')
                        ->label(fn (Get $get): string => "Label {$get('foo')}"),
                ])
                ->statePath('data');
        }
    })
        ->fillForm([
            'foo' => $foo = Str::random(),
        ])
        ->assertSeeText("Label {$foo}");
});

it('can get the value of a nested field', function (): void {
    livewire(new class extends Livewire
    {
        public function form(Schema $form): Schema
        {
            return $form
                ->components([
                    Section::make()
                        ->statePath('nested')
                        ->schema([
                            TextInput::make('foo')
                                ->live(),
                        ]),
                    TextInput::make('bar')
                        ->label(fn (Get $get): string => "Label {$get('nested.foo')}"),
                ])
                ->statePath('data');
        }
    })
        ->fillForm([
            'nested.foo' => $foo = Str::random(),
        ])
        ->assertSeeText("Label {$foo}");
});

it('can get the value from a parent level field', function (): void {
    livewire(new class extends Livewire
    {
        public function form(Schema $form): Schema
        {
            return $form
                ->components([
                    TextInput::make('foo')
                        ->live(),
                    Section::make()
                        ->statePath('nested')
                        ->schema([
                            TextInput::make('bar')
                                ->label(fn (Get $get): string => "Label {$get('../foo')}"),
                        ]),
                ])
                ->statePath('data');
        }
    })
        ->fillForm([
            'foo' => $foo = Str::random(),
        ])
        ->assertSeeText("Label {$foo}");
});

it('can get the value from a parent level field with a nested field', function (): void {
    livewire(new class extends Livewire
    {
        public function form(Schema $form): Schema
        {
            return $form
                ->components([
                    Section::make()
                        ->statePath('nestedOne')
                        ->schema([
                            TextInput::make('foo')
                                ->live(),
                        ]),
                    Section::make()
                        ->statePath('nestedTwo')
                        ->schema([
                            TextInput::make('bar')
                                ->label(fn (Get $get): string => "Label {$get('../nestedOne.foo')}"),
                        ]),
                ])
                ->statePath('data');
        }
    })
        ->fillForm([
            'nestedOne.foo' => $foo = Str::random(),
        ])
        ->assertSeeText("Label {$foo}");
});

it('can efficiently access values in a repeater', function (): void {
    $start = microtime(true);

    livewire(new class extends Livewire
    {
        public function form(Schema $form): Schema
        {
            return $form
                ->components([
                    Repeater::make('test')
                        ->statePath('test')
                        ->schema([
                            TextInput::make('foo'),
                            TextInput::make('bar')
                                ->label(fn (Get $get): ?string => $get('foo'))
                                ->hint(fn (Get $get): ?string => $get('foo'))
                                ->placeholder(fn (Get $get): ?string => $get('foo'))
                                ->helperText(fn (Get $get): ?string => $get('foo'))
                                ->prefix(fn (Get $get): ?string => $get('foo'))
                                ->suffix(fn (Get $get): ?string => $get('foo')),
                        ]),
                ])
                ->statePath('data');
        }
    })
        ->fillForm([
            'test' => array_map(
                fn () => ['alpha' => 'abc'],
                range(1, 100)
            ),
        ]);

    $duration = microtime(true) - $start;

    expect($duration)->toBeLessThan(1);
});
