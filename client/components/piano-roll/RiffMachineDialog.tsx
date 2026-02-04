import React, { useState } from 'react';
import { Note } from '@/lib/types/music';
import { applyArpeggio, applyRandomize, ArpPattern } from '@/lib/utils/riffMachine';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'; // Missing
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RiffMachineDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: (newNotes: Note[]) => void;
    selectedNotes: Note[]; 
}

export default function RiffMachineDialog({ isOpen, onClose, onAccept, selectedNotes }: RiffMachineDialogProps) {
    const [step, setStep] = useState<number>(1); 
    
    // Arp State
    const [arpPattern, setArpPattern] = useState<ArpPattern>('up');
    const [timeStep, setTimeStep] = useState<number>(0.25); 

    // Random State
    const [randVel, setRandVel] = useState<number>(0);
    const [randPan, setRandPan] = useState<number>(0);

    if (!isOpen) return null;

    // ... (logic)

    const getPreviewNotes = () => {
        let notes = [...selectedNotes];
        if (step === 1) {
             if (selectedNotes.length > 1) { 
                 notes = applyArpeggio(notes, arpPattern, timeStep);
             }
        }
        if (randVel > 0 || randPan > 0) {
            notes = applyRandomize(notes, randVel, randPan, 0);
        }
        return notes;
    };

    const handleApply = () => {
        const result = getPreviewNotes();
        onAccept(result);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-zinc-900 text-white border border-zinc-700 w-[400px] rounded-lg shadow-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
                    <h2 className="font-bold">Riff Machine</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
                </div>

                <div className="p-4">
                    <div className="flex space-x-2 mb-4 border-b border-zinc-700 pb-2">
                        <button onClick={() => setStep(1)} className={`text-xs p-1 ${step===1 ? 'text-orange-400 font-bold' : 'text-zinc-400'}`}>Arpeggiator</button>
                        <button onClick={() => setStep(2)} className={`text-xs p-1 ${step===2 ? 'text-orange-400 font-bold' : 'text-zinc-400'}`}>Randomize</button>
                        <button onClick={() => setStep(3)} className={`text-xs p-1 ${step===3 ? 'text-orange-400 font-bold' : 'text-zinc-400'}`}>Levels</button>
                    </div>

                    <div className="space-y-4 min-h-[200px]">
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400">Pattern</label>
                                    <Select value={arpPattern} onValueChange={(v: ArpPattern) => setArpPattern(v)}>
                                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-xs h-8">
                                            <SelectValue placeholder="Select Pattern" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                            <SelectItem value="up">Up</SelectItem>
                                            <SelectItem value="down">Down</SelectItem>
                                            <SelectItem value="upDown">Up-Down</SelectItem>
                                            <SelectItem value="random">Random</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400">Time Step (Measure)</label>
                                    <div className="flex items-center space-x-2">
                                        <Slider 
                                            value={[timeStep]} 
                                            min={0.0625} max={1} step={0.0625} 
                                            onValueChange={(v) => setTimeStep(v[0])}
                                            className="flex-1"
                                        />
                                        <span className="text-xs text-zinc-400 w-8">{timeStep}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                             <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400">Velocity Variance</label>
                                    <Slider value={[randVel]} min={0} max={1} step={0.01} onValueChange={(v) => setRandVel(v[0])} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400">Panning Variance</label>
                                    <Slider value={[randPan]} min={0} max={1} step={0.01} onValueChange={(v) => setRandPan(v[0])} />
                                </div>
                             </div>
                        )}

                        {step === 3 && (
                            <div className="text-center text-zinc-500 py-10">Levels Scaling (Coming Soon)</div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-zinc-800/50 border-t border-zinc-700 flex justify-end space-x-2">
                    <Button variant="outline" onClick={onClose} className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 h-8 text-xs">Cancel</Button>
                    <Button onClick={handleApply} className="bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs">Accept</Button>
                </div>
            </div>
        </div>
    );
}
